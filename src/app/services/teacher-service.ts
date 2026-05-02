import { teacherRepository } from "#app/repositories/teacher-repository.js";
import { actionRegistry } from "#app/services/actions/registry.js";
import { vocabularyAction } from "#app/services/actions/vocabulary-action.js";
import { clearVocabularyIntent } from "#app/services/actions/pending-proposals.js";

// Register teacher actions once at module load time
actionRegistry.register(vocabularyAction);
import { teacherSettingsRepository } from "#app/repositories/teacher-settings-repository.js";
import { teacherVocabularyRepository } from "#app/repositories/teacher-vocabulary-repository.js";
import { translatorRepository } from "#app/repositories/translator-repository.js";
import {
  teacherProfileTransformer,
  teacherLessonTransformer,
  teacherChatMessageTransformer,
  teacherVocabularyBatchTransformer,
  teacherVocabularyCollectionTransformer,
  teacherVocabularyProgressTransformer,
  teacherVocabularyWordTransformer,
} from "#app/transformers/teacher-transformer.js";
import { broadcastService } from "#app/services/broadcast-service.js";
import { teacherLlmService } from "#app/services/teacher-llm-service.js";
import { ttsAdapter } from "#app/services/ai/ai-provider.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";
import { grokUsageService } from "#app/services/grok-usage-service.js";
import aiConfig from "#config/ai.js";
import { promptService } from "#app/services/prompt-service.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import { resolveLearnerSettingsPromptContext } from "#app/services/learner-settings-prompt.js";
import {
  decodeBase64AudioChunk,
  nextTtsSessionId,
} from "#app/services/teacher-tts-binary-packet.js";
import {
  TtsSentenceQueue,
  extractCompleteSentences,
  prepareTextForTts,
} from "#app/services/tts-sentence-utils.js";
import { teacherSyntaxService } from "#app/services/teacher-syntax-service.js";
import { teacherVocabularyEmbeddingService } from "#app/services/teacher-vocabulary-embedding-service.js";
import { teacherKnownVocabularyContextService } from "#app/services/teacher-known-vocabulary-context-service.js";
import { normalizeTeacherVocabularyWord } from "./teacher-vocabulary-normalization.js";
import { resolveGrokVoice } from "#app/services/ai/grok-tts-helpers.js";
import {
  buildS3FileUrl,
  buildStudyAudioEntityKey,
  buildStudyAudioHash,
  buildStudyAudioLookupKey,
  requireStudyAudioLanguage,
  resolveStudyVoice,
  synthesizeStudyAudioToUrl,
} from "#app/services/shared/study-audio.js";
import logger from "#logger";
import { createHash } from "node:crypto";
import type { TeacherSettingsRow } from "#app/repositories/teacher-settings-repository.js";

const TTS_MAX_RETRIES = 3;
const TTS_RETRY_DELAY_MS = 1000;
const TEACHER_VOCABULARY_TARGET_COUNT = 20;
const PRIOR_WORDS_SIMILARITY_THRESHOLD = 0.45;
// LLM exclusion window is slice(0, 200); session-generated words are appended to the end.
// Cap initial exclusions so generated words stay within the window and are visible to the LLM.
const KNOWN_WORDS_EXCLUSION_CAP = 200 - TEACHER_VOCABULARY_TARGET_COUNT;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTeacherLanguages(
  requestedLangLearning: string,
  settings?: TeacherSettingsRow,
): { langLearning: string; langNative: string } {
  const settingsLangLearning = settings?.langLearning.trim();
  const settingsLangNative = settings?.langNative.trim();
  const langLearning =
    settingsLangLearning !== undefined && settingsLangLearning.length > 0
      ? settingsLangLearning
      : requestedLangLearning;
  const langNative =
    settingsLangNative !== undefined && settingsLangNative.length > 0
      ? settingsLangNative
      : "ru";
  return { langLearning, langNative };
}

interface StreamChunkResult {
  nextIndex: number;
  sessionId: number;
}

async function streamPreparedTextChunks(
  userIdStr: string,
  langLearning: string,
  prepared: string,
  startIndex: number,
  voice: string,
  sessionId: number,
  targetUuid?: string,
): Promise<StreamChunkResult> {
  let lastError: unknown;
  let currentSessionId = sessionId;

  for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Point 4: generate new sessionId on retry so frontend resets playback
      currentSessionId = nextTtsSessionId();
      logger.warn(
        { userIdStr, attempt, prepared, newSessionId: currentSessionId },
        "Teacher: TTS retry — new session, resetting index to 0",
      );
      await delay(TTS_RETRY_DELAY_MS);
      // Point 3 (variant B): reset index to 0 since frontend will reset on new sessionId
      startIndex = 0;
    }

    // Point 1: log each sentence sent to Inworld
    logger.info(
      {
        userIdStr,
        startIndex,
        sessionId: currentSessionId,
        textLength: prepared.length,
      },
      `Teacher: TTS synthesizing sentence: "${prepared.slice(0, 80)}"`,
    );

    try {
      let index = startIndex;
      for await (const chunkBase64 of ttsAdapter.synthesizeStream({
        text: prepared,
        voice,
        language: langLearning,
      })) {
        const pcmBytes = decodeBase64AudioChunk(chunkBase64);
        if (pcmBytes.length === 0) continue;
        const sent =
          targetUuid !== undefined
            ? broadcastService.broadcastTeacherTtsChunkBinaryToConnection(
                userIdStr,
                targetUuid,
                {
                  langLearning,
                  index: index++,
                  sessionId: currentSessionId,
                  pcmBytes,
                },
              )
            : broadcastService.broadcastTeacherTtsChunkBinary(userIdStr, {
                langLearning,
                index: index++,
                sessionId: currentSessionId,
                pcmBytes,
              });
        if (sent === 0 && targetUuid !== undefined) {
          broadcastService.broadcastTeacherTtsChunkBinary(userIdStr, {
            langLearning,
            index: index - 1,
            sessionId: currentSessionId,
            pcmBytes,
          });
        }
      }
      return { nextIndex: index, sessionId: currentSessionId };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function processTtsSentenceQueue(
  userId: bigint,
  userIdStr: string,
  langLearning: string,
  queue: TtsSentenceQueue,
  feature: "TEACHER_CHAT",
  voice: string,
  targetUuid?: string,
): Promise<void> {
  let globalIndex = 0;
  let totalChars = 0;
  let sessionId = nextTtsSessionId();
  try {
    for await (const sentence of queue) {
      const prepared = prepareTextForTts(sentence);
      if (prepared.length === 0) continue;
      totalChars += prepared.length;
      const result = await streamPreparedTextChunks(
        userIdStr,
        langLearning,
        prepared,
        globalIndex,
        voice,
        sessionId,
        targetUuid,
      );
      globalIndex = result.nextIndex;
      sessionId = result.sessionId;
    }
    if (totalChars > 0) {
      grokUsageService.record({
        userId,
        voice,
        language: langLearning,
        feature,
        characterCount: totalChars,
      });
    }
    if (targetUuid !== undefined) {
      const sent = broadcastService.broadcastMessageToUserConnection(
        userIdStr,
        targetUuid,
        "teacher_tts_complete",
        { langLearning },
      );
      if (sent === 0) {
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "teacher_tts_complete",
          { langLearning },
        );
      }
    } else {
      broadcastService.broadcastMessageToUser(
        userIdStr,
        "teacher_tts_complete",
        { langLearning },
      );
    }
  } catch (error) {
    logger.error({ err: error, userIdStr }, "Teacher: TTS streaming failed");
    if (targetUuid !== undefined) {
      const sent = broadcastService.broadcastMessageToUserConnection(
        userIdStr,
        targetUuid,
        "teacher_tts_error",
        {
          langLearning,
          message: "TTS failed",
        },
      );
      if (sent === 0) {
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "teacher_tts_error",
          {
            langLearning,
            message: "TTS failed",
          },
        );
      }
    } else {
      broadcastService.broadcastMessageToUser(userIdStr, "teacher_tts_error", {
        langLearning,
        message: "TTS failed",
      });
    }
  }
}

interface ActiveLessonChatContext {
  id: string;
  content: string;
  vocabularyWords: string[];
}

const VOCABULARY_PURPOSE_MIN_LENGTH = 10;
const VOCABULARY_PURPOSE_MAX_LENGTH = 240;

function slugifyTopic(topic: string): string {
  const trimmed = topic.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9а-яёіїєґ\s-]/gi, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length > 0 ? slug : "everyday";
}

function normalizeVocabularyPurpose(description: string): {
  description: string;
  slug: string;
} {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();
  const baseSlug = slugifyTopic(normalizedDescription).slice(0, 120);
  const hash = createHash("sha1")
    .update(normalizedDescription.toLowerCase())
    .digest("hex")
    .slice(0, 8);
  return {
    description: normalizedDescription,
    slug: `${baseSlug}-${hash}`,
  };
}

async function sendTeacherChatCompletion(
  userId: bigint,
  userIdStr: string,
  langLearning: string,
  fullReply: string,
): Promise<void> {
  if (fullReply.length > 0) {
    await teacherRepository.addChatMessage(
      userId,
      langLearning,
      "assistant",
      fullReply,
    );
  }
  broadcastService.broadcastMessageToUser(userIdStr, "teacher_chat_complete", {
    langLearning,
    content: fullReply,
  });
}

function speakTeacherChatText(
  userId: bigint,
  userIdStr: string,
  langLearning: string,
  text: string,
  voice: string,
): void {
  if (!ttsAdapter.isConfigured()) return;
  const ttsQueue = new TtsSentenceQueue();
  void processTtsSentenceQueue(
    userId,
    userIdStr,
    langLearning,
    ttsQueue,
    "TEACHER_CHAT",
    voice,
  );
  const prepared = prepareTextForTts(text);
  if (prepared.length > 0) {
    ttsQueue.push(prepared);
  }
  ttsQueue.close();
}

function buildVocabularyCreatedChatMessage(
  topic: string,
  words: string[],
  partialMessage?: string,
): string {
  const normalizedWords = words
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
  const wordsList = normalizedWords.join(", ");
  const count = normalizedWords.length;
  if (partialMessage !== undefined && partialMessage.trim().length > 0) {
    return `Словарь по теме "${topic}" создан частично: ${String(count)} слов. Список слов: ${wordsList}. Примечание: ${partialMessage}`;
  }
  return `Словарь по теме "${topic}" создан: ${String(count)} слов. Список слов: ${wordsList}.`;
}

async function assertUserHasVocabularyCollection(
  userId: bigint,
  collectionId: bigint,
): Promise<
  | {
      ok: true;
      collection: NonNullable<
        Awaited<
          ReturnType<typeof teacherVocabularyRepository.findCollectionById>
        >
      >;
    }
  | { ok: false; result: ReturnType<typeof failure> }
> {
  const collection =
    await teacherVocabularyRepository.findCollectionById(collectionId);
  if (collection === undefined) {
    return {
      ok: false,
      result: failure("NOT_FOUND", "Vocabulary collection not found"),
    };
  }

  const isAttached =
    await teacherVocabularyRepository.isUserAttachedToCollection(
      userId,
      collection.id,
    );
  if (!isAttached) {
    return {
      ok: false,
      result: failure(
        "UNAUTHORIZED",
        "Vocabulary collection does not belong to this user",
      ),
    };
  }

  return { ok: true, collection };
}

function extractVocabularyWords(
  vocabulary: { word: string; translation: string; example: string }[] | null,
): string[] {
  if (!Array.isArray(vocabulary)) return [];
  return vocabulary
    .map((item) => item.word)
    .filter((word) => word.trim().length > 0)
    .slice(0, 20);
}

export const teacherService = {
  async generateLesson(
    userId: bigint,
    sessionId: bigint,
    langLearning: string,
    langNative: string,
  ): Promise<void> {
    const userIdStr = String(userId);
    try {
      const messages =
        await translatorRepository.findMessagesBySessionId(sessionId);
      if (messages.length === 0) {
        logger.info(
          { userId: userIdStr, sessionId: String(sessionId) },
          "Teacher: no messages to analyze",
        );
        return;
      }

      const profile = await teacherRepository.upsertProfile(
        userId,
        langLearning,
        langNative,
      );
      const facts = await teacherRepository.findFacts(userId, langLearning);
      const tsettings = await teacherSettingsRepository.findByUserId(userId);
      const lessonTeacherName = tsettings?.teacherName ?? "Jessica";
      const lessonTeacherGender = tsettings?.teacherVoiceGender ?? "female";
      const learnerSettings = resolveLearnerSettingsPromptContext(tsettings);

      const conversationLines = messages.map((m) => {
        const speaker = m.side === "owner" ? "A" : "B";
        const translation =
          m.translatedText !== null && m.translatedText.trim().length > 0
            ? ` → ${m.translatedText}`
            : "";
        return `[${speaker}] (${m.sourceLang}→${m.targetLang}) ${m.sourceText}${translation}`;
      });

      const lessonPromptId = promptService.get("TEACHER_LESSON")?.id ?? null;
      const lessonResult = await teacherLlmService.generateLesson(
        conversationLines,
        langLearning,
        langNative,
        profile,
        facts,
        lessonTeacherName,
        lessonTeacherGender,
        learnerSettings,
        (usage, model, finalPrompt) => {
          llmUsageService.recordText({
            userId,
            llmSystemPromptId: lessonPromptId,
            model,
            feature: "TEACHER_LESSON",
            finalPrompt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        },
      );

      if (lessonResult === null) {
        logger.warn(
          { userId: userIdStr },
          "Teacher: lesson generation returned null",
        );
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "teacher_lesson_error",
          {
            sessionId: String(sessionId),
            message: "Failed to generate lesson. Please try again.",
          },
        );
        return;
      }

      const wordCount = lessonResult.vocabulary.length;

      const lesson = await teacherRepository.createLesson({
        userId,
        sessionId,
        langLearning,
        content: lessonResult.content,
        vocabulary: lessonResult.vocabulary,
        grammarNotes: lessonResult.grammarNotes,
        homework: lessonResult.homework,
      });

      // Save new facts
      for (const fact of lessonResult.newFacts) {
        if (fact.trim().length > 0) {
          await teacherRepository.addFact(
            userId,
            langLearning,
            fact,
            sessionId,
          );
        }
      }

      // Update profile
      const interestsArr: string[] = Array.isArray(profile.interests)
        ? [...profile.interests]
        : [];
      for (const interest of lessonResult.interests) {
        if (!interestsArr.includes(interest)) {
          interestsArr.push(interest);
        }
      }

      const summaryParts: string[] = [];
      if (lessonResult.newFacts.length > 0) {
        summaryParts.push(lessonResult.newFacts.slice(0, 5).join("; "));
      }

      await teacherRepository.updateProfile(userId, langLearning, {
        totalLessons: profile.totalLessons + 1,
        totalWords: profile.totalWords + wordCount,
        level: lessonResult.levelGuess,
        interests: interestsArr.slice(0, 20),
        summary:
          summaryParts.length > 0
            ? summaryParts.join(" | ")
            : (profile.summary ?? ""),
      });

      broadcastService.broadcastMessageToUser(userIdStr, "teacher_lesson", {
        lessonId: String(lesson.id),
        sessionId: String(sessionId),
        langLearning,
        content: lesson.content,
        vocabulary: lessonResult.vocabulary,
        grammarNotes: lesson.grammarNotes ?? "",
        homework: lesson.homework ?? "",
      });
    } catch (error) {
      logger.error(
        { err: error, userId: userIdStr },
        "Teacher: lesson generation failed",
      );
    }
  },

  async openChat(
    userId: bigint,
    requestedLangLearning: string,
    withTts = false,
    targetUuid?: string,
  ): Promise<void> {
    const userIdStr = String(userId);
    let langLearning = requestedLangLearning;
    try {
      const settings = await teacherSettingsRepository.findByUserId(userId);
      const resolvedLanguages = resolveTeacherLanguages(
        requestedLangLearning,
        settings,
      );
      langLearning = resolvedLanguages.langLearning;
      const langNative = resolvedLanguages.langNative;
      const teacherVoice = resolveGrokVoice(
        settings?.teacherVoice,
        aiConfig.grokTts.defaultVoice,
      );
      const openTeacherName = settings?.teacherName ?? "";
      const openTeacherGender = settings?.teacherVoiceGender ?? "female";
      const learnerSettings = resolveLearnerSettingsPromptContext(settings);

      const existingHistory = await teacherRepository.findRecentChatHistory(
        userId,
        langLearning,
        30,
      );
      const isFirstChat = existingHistory.length === 0;
      const openChatPromptId =
        promptService.get(isFirstChat ? "TEACHER_FIRST_CHAT" : "TEACHER_SYSTEM")
          ?.id ?? null;
      const ttsQueue =
        withTts && ttsAdapter.isConfigured() ? new TtsSentenceQueue() : null;
      let sentenceAccum = "";
      if (ttsQueue !== null) {
        void processTtsSentenceQueue(
          userId,
          userIdStr,
          langLearning,
          ttsQueue,
          "TEACHER_CHAT",
          teacherVoice,
          targetUuid,
        );
      }
      let fullReply = "";
      for await (const token of teacherLlmService.openChatStream(
        langLearning,
        langNative,
        openTeacherName,
        openTeacherGender,
        isFirstChat,
        existingHistory,
        learnerSettings,
        (usage, model, finalPrompt) => {
          llmUsageService.recordText({
            userId,
            llmSystemPromptId: openChatPromptId,
            model,
            feature: "TEACHER_CHAT",
            finalPrompt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        },
      )) {
        fullReply += token;
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "teacher_chat_token",
          {
            token,
            langLearning,
          },
        );
        if (ttsQueue !== null) {
          sentenceAccum += token;
          const extracted = extractCompleteSentences(sentenceAccum);
          for (const s of extracted.sentences) {
            ttsQueue.push(s);
          }
          sentenceAccum = extracted.remainder;
        }
      }
      if (ttsQueue !== null) {
        if (sentenceAccum.trim().length > 0) {
          ttsQueue.push(sentenceAccum);
        }
        ttsQueue.close();
      }

      if (fullReply.length > 0) {
        await teacherRepository.addChatMessage(
          userId,
          langLearning,
          "assistant",
          fullReply,
        );
      }

      broadcastService.broadcastMessageToUser(
        userIdStr,
        "teacher_chat_complete",
        {
          langLearning,
          content: fullReply,
        },
      );
    } catch (error) {
      logger.error(
        { err: error, userId: userIdStr },
        "Teacher: openChat failed",
      );
      broadcastService.broadcastMessageToUser(userIdStr, "teacher_chat_error", {
        langLearning,
        message: "Open chat failed",
      });
    }
  },

  async chat(
    userId: bigint,
    message: string,
    requestedLangLearning: string,
    isFirstChat: boolean,
    lessonId?: string | null,
    withTts = false,
    targetUuid?: string,
  ): Promise<void> {
    const userIdStr = String(userId);
    let langLearning = requestedLangLearning;
    try {
      const settings = await teacherSettingsRepository.findByUserId(userId);
      const resolvedLanguages = resolveTeacherLanguages(
        requestedLangLearning,
        settings,
      );
      langLearning = resolvedLanguages.langLearning;
      const settingsLangNative = resolvedLanguages.langNative;
      const profile = await teacherRepository.findProfile(userId, langLearning);
      const langNative = profile?.langNative ?? settingsLangNative;
      const chatHistory = await teacherRepository.findRecentChatHistory(
        userId,
        langLearning,
        30,
      );
      const effectiveIsFirstChat = chatHistory.length === 0;
      if (isFirstChat !== effectiveIsFirstChat) {
        logger.info(
          {
            userId: userIdStr,
            clientIsFirstChat: isFirstChat,
            effectiveIsFirstChat,
          },
          "Teacher chat: ignoring stale client isFirstChat flag",
        );
      }
      let activeLessonContext: ActiveLessonChatContext | undefined;

      const teacherVoice = resolveGrokVoice(
        settings?.teacherVoice,
        aiConfig.grokTts.defaultVoice,
      );
      const chatTeacherName = settings?.teacherName ?? "";
      const chatTeacherGender = settings?.teacherVoiceGender ?? "female";
      const learnerSettings = resolveLearnerSettingsPromptContext(settings);

      // Save user message
      await teacherRepository.addChatMessage(
        userId,
        langLearning,
        "user",
        message,
      );

      const chatPromptType = effectiveIsFirstChat
        ? "TEACHER_FIRST_CHAT"
        : "TEACHER_SYSTEM";
      const chatPromptId = promptService.get(chatPromptType)?.id ?? null;

      const vocabularyIntent = await teacherLlmService.detectVocabularyIntent(
        message,
        langLearning,
        langNative,
        chatHistory,
        chatTeacherName,
        chatTeacherGender,
        learnerSettings,
        (usage, model, finalPrompt) => {
          llmUsageService.recordText({
            userId,
            llmSystemPromptId: chatPromptId,
            model,
            feature: "TEACHER_CHAT",
            finalPrompt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        },
      );
      logger.info(
        {
          userId: userIdStr,
          langLearning,
          intent: vocabularyIntent.intent,
          topic: vocabularyIntent.topic ?? null,
          hasDescription: vocabularyIntent.description !== undefined,
          hasReply: vocabularyIntent.reply !== undefined,
        },
        "Teacher chat: vocabulary intent evaluated",
      );

      if (vocabularyIntent.intent === "ask_topic") {
        const reply =
          vocabularyIntent.reply !== undefined && vocabularyIntent.reply.length > 0
            ? vocabularyIntent.reply
            : "На какую тему создать vocabulary?";
        logger.info(
          {
            userId: userIdStr,
            langLearning,
            replyLength: reply.length,
          },
          "Teacher chat: asking user to clarify vocabulary topic",
        );
        await sendTeacherChatCompletion(userId, userIdStr, langLearning, reply);
        speakTeacherChatText(
          userId,
          userIdStr,
          langLearning,
          reply,
          teacherVoice,
        );
        return;
      }

      if (
        vocabularyIntent.intent === "create_vocabulary" &&
        vocabularyIntent.topic !== undefined &&
        vocabularyIntent.description !== undefined
      ) {
        logger.info(
          {
            userId: userIdStr,
            langLearning,
            topic: vocabularyIntent.topic,
            descriptionLength: vocabularyIntent.description.length,
            targetUuid: targetUuid ?? null,
          },
          "Teacher chat: executing vocabulary proposal action",
        );
        const proposalResult = await (
          vocabularyAction.execute as (
            params: unknown,
            ctx: {
              userId: bigint;
              userIdStr: string;
              langLearning: string;
              targetUuid: string | undefined;
            },
          ) => Promise<{ success: boolean }>
        )(
          {
            topic: vocabularyIntent.topic,
            description: vocabularyIntent.description,
          },
          {
            userId,
            userIdStr,
            langLearning,
            targetUuid,
          },
        );
        logger.info(
          {
            userId: userIdStr,
            langLearning,
            topic: vocabularyIntent.topic,
            success: proposalResult.success,
          },
          "Teacher chat: vocabulary proposal action finished",
        );

        if (proposalResult.success) {
          const reply =
            vocabularyIntent.reply !== undefined && vocabularyIntent.reply.length > 0
              ? vocabularyIntent.reply
              : `В чате появилась карточка с кнопками Create и Cancel для vocabulary по теме "${vocabularyIntent.topic}".`;
          logger.info(
            {
              userId: userIdStr,
              langLearning,
              topic: vocabularyIntent.topic,
              replyLength: reply.length,
            },
            "Teacher chat: vocabulary proposal sent to frontend",
          );
          await sendTeacherChatCompletion(
            userId,
            userIdStr,
            langLearning,
            reply,
          );
          speakTeacherChatText(
            userId,
            userIdStr,
            langLearning,
            reply,
            teacherVoice,
          );
          return;
        }
        logger.warn(
          {
            userId: userIdStr,
            langLearning,
            topic: vocabularyIntent.topic,
          },
          "Teacher chat: vocabulary proposal action failed, falling back to normal chat reply",
        );
      }

      const facts = await teacherRepository.findFacts(userId, langLearning);
      const recentLessons = await teacherRepository.findLessons(
        userId,
        langLearning,
        5,
      );

      if (typeof lessonId === "string" && /^[0-9]+$/.test(lessonId.trim())) {
        const normalizedLessonId = lessonId.trim();
        const lesson = await teacherRepository.findLessonById(
          BigInt(normalizedLessonId),
        );
        if (lesson?.userId === userId && lesson.langLearning === langLearning) {
          activeLessonContext = {
            id: String(lesson.id),
            content: lesson.content,
            vocabularyWords: extractVocabularyWords(lesson.vocabulary),
          };
        }
      }

      const knownVocabularyContext =
        effectiveIsFirstChat
          ? undefined
          : await teacherKnownVocabularyContextService.getForChat({
              userId,
              langLearning,
              langNative,
              activeLessonWords: activeLessonContext?.vocabularyWords ?? [],
            });

      const ttsQueue =
        withTts && ttsAdapter.isConfigured() ? new TtsSentenceQueue() : null;
      let sentenceAccum = "";
      if (ttsQueue !== null) {
        void processTtsSentenceQueue(
          userId,
          userIdStr,
          langLearning,
          ttsQueue,
          "TEACHER_CHAT",
          teacherVoice,
          targetUuid,
        );
      }
      let fullReply = "";
      for await (const token of teacherLlmService.chatStream(
        message,
        langLearning,
        langNative,
        profile,
        facts,
        chatHistory,
        recentLessons,
        chatTeacherName,
        chatTeacherGender,
        learnerSettings,
        activeLessonContext,
        knownVocabularyContext,
        effectiveIsFirstChat,
        (usage, model, finalPrompt) => {
          llmUsageService.recordText({
            userId,
            llmSystemPromptId: chatPromptId,
            model,
            feature: "TEACHER_CHAT",
            finalPrompt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        },
        { userId, userIdStr, langLearning, targetUuid },
      )) {
        fullReply += token;
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "teacher_chat_token",
          {
            token,
            langLearning,
          },
        );
        if (ttsQueue !== null) {
          sentenceAccum += token;
          const extracted = extractCompleteSentences(sentenceAccum);
          for (const s of extracted.sentences) {
            ttsQueue.push(s);
          }
          sentenceAccum = extracted.remainder;
        }
      }
      if (ttsQueue !== null) {
        if (sentenceAccum.trim().length > 0) {
          ttsQueue.push(sentenceAccum);
        }
        ttsQueue.close();
      }

      // Extract facts from first-chat exchange (fire-and-forget)
      if (effectiveIsFirstChat && fullReply.length > 0) {
        void teacherLlmService
          .extractFirstChatFacts(
            message,
            fullReply,
            langNative,
            learnerSettings,
            (usage, model, finalPrompt) => {
              llmUsageService.recordText({
                userId,
                llmSystemPromptId: null,
                model,
                feature: "TEACHER_FACTS",
                finalPrompt,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              });
            },
          )
          .then(async (newFacts) => {
            for (const fact of newFacts) {
              await teacherRepository.addFact(userId, langLearning, fact);
            }
          })
          .catch((err: unknown) => {
            logger.warn({ err }, "Teacher: fact extraction failed");
          });
      }

      await sendTeacherChatCompletion(
        userId,
        userIdStr,
        langLearning,
        fullReply,
      );
    } catch (error) {
      logger.error({ err: error, userId: userIdStr }, "Teacher: chat failed");
      broadcastService.broadcastMessageToUser(userIdStr, "teacher_chat_error", {
        langLearning,
        message: "Chat failed",
      });
    }
  },

  async getProfile(
    userId: bigint,
    langLearning: string,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof teacherProfileTransformer.serialize> | null;
    }>
  > {
    const profile = await teacherRepository.findProfile(userId, langLearning);
    if (profile === undefined) {
      return success({ data: null });
    }
    return success({ data: teacherProfileTransformer.serialize(profile) });
  },

  async getLessons(
    userId: bigint,
    langLearning: string,
    limit?: number,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof teacherLessonTransformer.serializeArray>;
    }>
  > {
    const lessons = await teacherRepository.findLessons(
      userId,
      langLearning,
      limit,
    );
    return success({ data: teacherLessonTransformer.serializeArray(lessons) });
  },

  async getLessonById(
    userId: bigint,
    lessonId: string,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof teacherLessonTransformer.serialize>;
    }>
  > {
    const lesson = await teacherRepository.findLessonById(BigInt(lessonId));
    if (lesson === undefined) {
      return failure("NOT_FOUND", "Lesson not found");
    }
    if (lesson.userId !== userId) {
      return failure("UNAUTHORIZED", "Lesson does not belong to this user");
    }
    return success({ data: teacherLessonTransformer.serialize(lesson) });
  },

  async getChatHistory(
    userId: bigint,
    langLearning: string,
    limit?: number,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof teacherChatMessageTransformer.serializeArray>;
    }>
  > {
    const history = await teacherRepository.findRecentChatHistory(
      userId,
      langLearning,
      limit,
    );
    return success({
      data: teacherChatMessageTransformer.serializeArray(history),
    });
  },

  async getLessonStatusForSession(
    userId: bigint,
    sessionId: string,
  ): Promise<ServiceResult<{ exists: boolean; lessonId: string | null }>> {
    const lesson = await teacherRepository.findLessonBySessionId(
      BigInt(sessionId),
      userId,
    );
    return success({
      exists: lesson !== undefined,
      lessonId: lesson !== undefined ? String(lesson.id) : null,
    });
  },

  async deleteChatHistory(
    userId: bigint,
  ): Promise<ServiceResult<Record<string, never>>> {
    await teacherRepository.deleteAllChatHistory(userId);
    return success({});
  },

  async deleteFacts(
    userId: bigint,
  ): Promise<ServiceResult<Record<string, never>>> {
    await teacherRepository.deleteAllFacts(userId);
    await teacherRepository.deleteAllProfiles(userId);
    return success({});
  },

  async deleteLessons(
    userId: bigint,
  ): Promise<ServiceResult<Record<string, never>>> {
    await teacherRepository.deleteAllLessons(userId);
    await teacherSyntaxService.deleteAllSyntaxLessons(userId);
    return success({});
  },

  async generateVocabulary(
    userId: bigint,
    langLearning: string,
    description: string,
    langNative?: string,
    topic?: string,
    levelCode?: string,
  ): Promise<
    ServiceResult<{ batchId?: string; collectionId: string; reused: boolean }>
  > {
    const settings = await teacherSettingsRepository.findByUserId(userId);
    const teacherVoice = resolveGrokVoice(
      settings?.teacherVoice,
      aiConfig.grokTts.defaultVoice,
    );
    const learnerSettings = resolveLearnerSettingsPromptContext(settings);
    const topicCandidate = topic?.trim();
    const settingsTopicCandidate = settings?.topic.trim();
    const resolvedTopic =
      topicCandidate !== undefined && topicCandidate.length > 0
        ? topicCandidate
        : settingsTopicCandidate !== undefined && settingsTopicCandidate.length > 0
          ? settingsTopicCandidate
          : "everyday";
    const resolvedLangNative = langNative ?? settings?.langNative ?? "ru";
    const rawDescription = description.trim();
    if (
      rawDescription.length < VOCABULARY_PURPOSE_MIN_LENGTH ||
      rawDescription.length > VOCABULARY_PURPOSE_MAX_LENGTH
    ) {
      return failure(
        "BAD_REQUEST",
        `Description must be ${String(VOCABULARY_PURPOSE_MIN_LENGTH)}-${String(VOCABULARY_PURPOSE_MAX_LENGTH)} characters long`,
      );
    }

    const topicSlug = slugifyTopic(resolvedTopic);
    const normalizedPurpose = normalizeVocabularyPurpose(rawDescription);
    const normalizedLevelCode = levelCode ?? null;
    let queryVector: number[] | null = null;

    if (teacherVocabularyEmbeddingService.isEnabled()) {
      queryVector = await teacherVocabularyEmbeddingService.embedCollection({
        topicTitle: resolvedTopic,
        purposeDescription: normalizedPurpose.description,
        langLearning,
        langNative: resolvedLangNative,
        levelCode: normalizedLevelCode,
      });

      if (queryVector !== null) {
        const reusableCollection =
          await teacherVocabularyRepository.findReusableCollectionForUser({
            userId,
            langLearning,
            langNative: resolvedLangNative,
            levelCode: normalizedLevelCode,
            queryVector,
            maxDistance: teacherVocabularyEmbeddingService.getMaxDistance(),
          });

        if (reusableCollection !== undefined) {
          const wordsCount = await teacherVocabularyRepository.countWordsByCollectionId(
            reusableCollection.id,
          );
          await teacherVocabularyRepository.attachCollectionToUser(
            userId,
            reusableCollection.id,
          );

          broadcastService.broadcastMessageToUser(
            String(userId),
            "teacher_vocabulary_ready",
            {
              collectionId: String(reusableCollection.id),
              topic: reusableCollection.topicTitle,
              langLearning,
              wordsCount,
              reused: true,
            },
          );

          return success({
            collectionId: String(reusableCollection.id),
            reused: true,
          });
        }
      }
    }

    const { collection, isNew } =
      await teacherVocabularyRepository.findOrCreateCollection({
        creatorUserId: userId,
        langLearning,
        langNative: resolvedLangNative,
        topicSlug,
        topicTitle: resolvedTopic,
        purposeDescription: normalizedPurpose.description,
        purposeSlug: normalizedPurpose.slug,
        levelCode: normalizedLevelCode,
      });
    const isAttached = isNew
      ? false
      : await teacherVocabularyRepository.isUserAttachedToCollection(
          userId,
          collection.id,
        );

    const activeBatch = await teacherVocabularyRepository.findActiveBatch(
      collection.id,
    );
    if (activeBatch !== undefined) {
      if (!isAttached) {
        await teacherVocabularyRepository.attachCollectionToUser(
          userId,
          collection.id,
        );
      }
      return success({
        batchId: String(activeBatch.id),
        collectionId: String(collection.id),
        reused: false,
      });
    }

    if (!isNew) {
      if (collection.status === "ready") {
        const wordsCount = await teacherVocabularyRepository.countWordsByCollectionId(
          collection.id,
        );
        if (wordsCount > 0) {
          if (!isAttached) {
            await teacherVocabularyRepository.attachCollectionToUser(
              userId,
              collection.id,
            );
          }

          broadcastService.broadcastMessageToUser(
            String(userId),
            "teacher_vocabulary_ready",
            {
              collectionId: String(collection.id),
              topic: collection.topicTitle,
              langLearning,
              wordsCount,
              reused: true,
            },
          );

          return success({
            collectionId: String(collection.id),
            reused: true,
          });
        }
      }

      const latestBatch =
        await teacherVocabularyRepository.findLatestBatchByCollectionId(
          collection.id,
        );
      if (latestBatch !== undefined) {
        const elapsed = Date.now() - latestBatch.createdAt.getTime();
        if (elapsed < 60_000) {
          return failure("BAD_REQUEST", "Please wait before generating again");
        }
      }
    }

    if (!isAttached) {
      await teacherVocabularyRepository.attachCollectionToUser(
        userId,
        collection.id,
      );
    }

    const batch = await teacherVocabularyRepository.createBatch(
      collection.id,
      TEACHER_VOCABULARY_TARGET_COUNT,
    );
    await teacherVocabularyRepository.updateCollectionStatus(
      collection.id,
      "generating",
    );
    broadcastService.broadcastMessageToUser(
      String(userId),
      "teacher_vocabulary_batch_queued",
      {
        batchId: String(batch.id),
        collectionId: String(collection.id),
        topic: resolvedTopic,
        langLearning,
        reused: false,
      },
    );

    void (async (): Promise<void> => {
      try {
        await teacherVocabularyRepository.markBatchGenerating(batch.id);
        const knownWords =
          await teacherVocabularyRepository.findAllNormalizedUserWords(
            userId,
            langLearning,
          );
        let prioritizedKnownWords = knownWords;

        if (queryVector !== null) {
          try {
            const similarOwned =
              await teacherVocabularyRepository.findSimilarOwnedCollections({
                userId,
                queryVector,
                langLearning,
                langNative: resolvedLangNative,
                levelCode: normalizedLevelCode,
                maxDistance: PRIOR_WORDS_SIMILARITY_THRESHOLD,
                excludeCollectionId: collection.id,
              });

            if (similarOwned.length > 0) {
              logger.info(
                {
                  collectionIds: similarOwned.map((item) => item.id),
                  count: similarOwned.length,
                },
                "Found similar owned collections for word exclusion prioritization",
              );

              const priorityWords =
                await teacherVocabularyRepository.getPriorityWordsByCollectionIds(
                  {
                    userId,
                    collectionIds: similarOwned.map((item) => item.id),
                    limit: 100,
                  },
                );

              if (priorityWords.length > 0) {
                const prioritySet = new Set(priorityWords);
                const remainingWords = knownWords.filter(
                  (word) => !prioritySet.has(word),
                );
                prioritizedKnownWords = [...priorityWords, ...remainingWords];
              }
            }
          } catch (error) {
            logger.warn(
              { err: error },
              "Failed to load prior words for exclusion, using unordered knownWords",
            );
          }
        }

        // Cap so session-generated words stay within LLM exclusion window (slice 0..200)
        prioritizedKnownWords = prioritizedKnownWords.slice(0, KNOWN_WORDS_EXCLUSION_CAP);

        let batchLlmModel: string | undefined;
        const generated = await teacherLlmService.generateVocabularyBatch(
          resolvedTopic,
          normalizedPurpose.description,
          langLearning,
          resolvedLangNative,
          levelCode ?? "a1",
          prioritizedKnownWords,
          learnerSettings,
          (usage, model, finalPrompt) => {
            batchLlmModel = model;
            llmUsageService.recordText({
              userId,
              llmSystemPromptId:
                promptService.get("TEACHER_VOCABULARY_SYSTEM")?.id ??
                promptService.get("TEACHER_SYSTEM")?.id ??
                null,
              model,
              feature: "TEACHER_VOCABULARY",
              finalPrompt,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            });
          },
          async (generatedCount, requestedCount, item) => {
            await teacherVocabularyRepository.updateBatchGeneratedCount(
              batch.id,
              generatedCount,
            );
            broadcastService.broadcastMessageToUser(
              String(userId),
              "teacher_vocabulary_batch_progress",
              {
                batchId: String(batch.id),
                collectionId: String(collection.id),
                topic: resolvedTopic,
                langLearning,
                generatedCount,
                requestedCount,
                latestWord: item.word,
              },
            );
          },
        );
        await teacherVocabularyRepository.updateBatchMeta(batch.id, {
          llmModel: batchLlmModel,
          promptVersion: "v4-sequential-single-item",
        });

        const seen = new Set(knownWords);
        const deduped = generated
          .map((item, index) => ({
            ...item,
            normalizedWord: normalizeTeacherVocabularyWord(item.word),
            sortOrder: index,
          }))
          .filter((item) => {
            if (item.normalizedWord.length === 0) return false;
            if (seen.has(item.normalizedWord)) return false;
            seen.add(item.normalizedWord);
            return true;
          });

        if (deduped.length === 0) {
          await teacherVocabularyRepository.markBatchError(
            batch.id,
            "No unique vocabulary generated",
          );
          await teacherVocabularyRepository.updateCollectionStatus(
            collection.id,
            "error",
          );
          broadcastService.broadcastMessageToUser(
            String(userId),
            "teacher_vocabulary_error",
            {
              batchId: String(batch.id),
              collectionId: String(collection.id),
              topic: resolvedTopic,
              langLearning,
              message: "No unique vocabulary generated",
            },
          );
          return;
        }

        const words = await teacherVocabularyRepository.upsertWords(
          collection.id,
          batch.id,
          deduped.map((item) => ({
            word: item.word,
            normalizedWord: item.normalizedWord,
            translation: item.translation,
            transcription: item.transcription,
            partOfSpeech: item.partOfSpeech,
            sortOrder: item.sortOrder,
          })),
        );

        for (const { row: wordRow, isNew } of words) {
          const source = deduped.find(
            (item) => item.normalizedWord === wordRow.normalizedWord,
          );
          if (source === undefined) continue;
          if (isNew) {
            await teacherVocabularyRepository.replaceExamples(
              wordRow.id,
              source.examples.map((example, index) => ({
                sortOrder: index,
                sentence: example.sentence,
                translation: example.translation,
              })),
            );
          }
          await teacherVocabularyRepository.ensureProgress(userId, wordRow.id);
        }

        if (deduped.length < TEACHER_VOCABULARY_TARGET_COUNT) {
          const partialMessage = `Generated fewer than ${String(TEACHER_VOCABULARY_TARGET_COUNT)} unique items`;
          await teacherVocabularyRepository.markBatchPartial(
            batch.id,
            deduped.length,
            partialMessage,
          );
          await teacherVocabularyRepository.updateCollectionStatus(
            collection.id,
            "partial",
          );
          broadcastService.broadcastMessageToUser(
            String(userId),
            "teacher_vocabulary_partial",
            {
              batchId: String(batch.id),
              collectionId: String(collection.id),
              topic: resolvedTopic,
              langLearning,
              wordsCount: deduped.length,
              message: partialMessage,
              reused: false,
            },
          );
          clearVocabularyIntent(String(userId));
          await sendTeacherChatCompletion(
            userId,
            String(userId),
            langLearning,
            buildVocabularyCreatedChatMessage(
              resolvedTopic,
              deduped.map((item) => item.word),
              partialMessage,
            ),
          );
          speakTeacherChatText(
            userId,
            String(userId),
            langLearning,
            buildVocabularyCreatedChatMessage(
              resolvedTopic,
              deduped.map((item) => item.word),
              partialMessage,
            ),
            teacherVoice,
          );
        } else {
          await teacherVocabularyRepository.markBatchReady(
            batch.id,
            deduped.length,
          );
          await teacherVocabularyRepository.updateCollectionStatus(
            collection.id,
            "ready",
          );
          broadcastService.broadcastMessageToUser(
            String(userId),
            "teacher_vocabulary_ready",
            {
              batchId: String(batch.id),
              collectionId: String(collection.id),
              topic: resolvedTopic,
              langLearning,
              wordsCount: deduped.length,
              reused: false,
            },
          );
          await teacherVocabularyEmbeddingService.indexCollection(
            collection.id,
            {
              topicTitle: resolvedTopic,
              purposeDescription: normalizedPurpose.description,
              langLearning,
              langNative: resolvedLangNative,
              levelCode: normalizedLevelCode,
            },
          );
          clearVocabularyIntent(String(userId));
          await sendTeacherChatCompletion(
            userId,
            String(userId),
            langLearning,
            buildVocabularyCreatedChatMessage(
              resolvedTopic,
              deduped.map((item) => item.word),
            ),
          );
          speakTeacherChatText(
            userId,
            String(userId),
            langLearning,
            buildVocabularyCreatedChatMessage(
              resolvedTopic,
              deduped.map((item) => item.word),
            ),
            teacherVoice,
          );
        }
      } catch (error) {
        logger.error(
          { err: error, userId: String(userId) },
          "Teacher: vocabulary generation failed",
        );
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Vocabulary generation failed";
        await teacherVocabularyRepository.markBatchError(batch.id, message);
        await teacherVocabularyRepository.updateCollectionStatus(
          collection.id,
          "error",
        );
        broadcastService.broadcastMessageToUser(
          String(userId),
          "teacher_vocabulary_error",
          {
            batchId: String(batch.id),
            collectionId: String(collection.id),
            topic: resolvedTopic,
            langLearning,
            message,
            reused: false,
          },
        );
      }
    })();

    return success({
      batchId: String(batch.id),
      collectionId: String(collection.id),
      reused: false,
    });
  },

  async getVocabularyCollections(
    userId: bigint,
    langLearning: string,
  ): Promise<ServiceResult<{ data: Record<string, unknown>[]; stats: { total: number; mastered: number; reviewing: number; learning: number; newWords: number } }>> {
    const [collections, stats] = await Promise.all([
      teacherVocabularyRepository.findCollectionsByUser(userId, langLearning),
      teacherVocabularyRepository.getVocabularyStats({ userId, langLearning }),
    ]);
    const data = await Promise.all(
      collections.map(async (collection) => {
        const latestBatch =
          await teacherVocabularyRepository.findLatestBatchByCollectionId(
            collection.id,
          );
        const words = await teacherVocabularyRepository.findWordsByCollectionId(
          collection.id,
        );
        const progress = await teacherVocabularyRepository.getProgressByWordIds(
          userId,
          words.map((word) => word.id),
        );
        const masteredCount = progress.filter(
          (item) => item.masteryStatus === "mastered",
        ).length;
        return {
          ...teacherVocabularyCollectionTransformer.serialize(collection),
          latestBatch:
            latestBatch !== undefined
              ? teacherVocabularyBatchTransformer.serialize(latestBatch)
              : null,
          wordsCount: words.length,
          masteredCount,
        };
      }),
    );
    return success({ data, stats });
  },

  async getVocabularyCollectionWords(
    userId: bigint,
    collectionId: string,
  ): Promise<ServiceResult<{ data: Record<string, unknown> }>> {
    const access = await assertUserHasVocabularyCollection(
      userId,
      BigInt(collectionId),
    );
    if (!access.ok) {
      return access.result;
    }
    const { collection } = access;
    const latestBatch =
      await teacherVocabularyRepository.findLatestBatchByCollectionId(
        collection.id,
      );
    const words = await teacherVocabularyRepository.findWordsByCollectionId(
      collection.id,
    );
    const wordIds = words.map((word) => word.id);
    const examples =
      await teacherVocabularyRepository.findExamplesByWordIds(wordIds);
    const exampleIds = examples.map((e) => e.id);
    const voice = resolveStudyVoice();
    const language = requireStudyAudioLanguage(
      collection.langLearning,
      `vocabulary collection ${String(collection.id)}`,
    );
    const wordHashById = new Map(
      words.map((word) => [
        String(word.id),
        buildStudyAudioHash({ text: word.word, language }),
      ]),
    );
    const exampleHashById = new Map(
      examples.map((example) => [
        String(example.id),
        buildStudyAudioHash({ text: example.sentence, language }),
      ]),
    );
    const [progress, wordAudioRows, exampleAudioRows] = await Promise.all([
      teacherVocabularyRepository.getProgressByWordIds(userId, wordIds),
      teacherVocabularyRepository.findWordAudioByWordIds(wordIds, voice, language, [...new Set(wordHashById.values())]),
      teacherVocabularyRepository.findExampleAudioByExampleIds(exampleIds, voice, language, [...new Set(exampleHashById.values())]),
    ]);
    const wordAudioMap = new Map(
      wordAudioRows
        .filter((row) => wordHashById.get(String(row.scopeId)) === row.contentHash)
        .map((row) => [row.scopeId, row]),
    );
    const exampleAudioMap = new Map(
      exampleAudioRows
        .filter((row) => exampleHashById.get(String(row.scopeId)) === row.contentHash)
        .map((row) => [row.scopeId, row]),
    );
    const data = {
      collection: teacherVocabularyCollectionTransformer.serialize(collection),
      latestBatch:
        latestBatch !== undefined
          ? teacherVocabularyBatchTransformer.serialize(latestBatch)
          : null,
      words: words.map((word) =>
        teacherVocabularyWordTransformer.serialize(word, {
          examples: examples.filter((example) => example.wordId === word.id),
          progress: progress.find((item) => item.wordId === word.id) ?? null,
          wordAudio: wordAudioMap.get(word.id) ?? null,
          exampleAudios: exampleAudioMap,
        }),
      ),
    };
    return success({ data });
  },

  async getWordAudio(
    userId: bigint,
    wordId: string,
  ): Promise<ServiceResult<{ audioUrl: string; voiceSrc: string }>> {
    const word = await teacherVocabularyRepository.findWordById(BigInt(wordId));
    if (word === undefined) {
      return failure("NOT_FOUND", "Vocabulary word not found");
    }
    const access = await assertUserHasVocabularyCollection(
      userId,
      word.collectionId,
    );
    if (!access.ok) {
      return failure(
        "UNAUTHORIZED",
        "Vocabulary word does not belong to this user",
      );
    }
    const voice = resolveStudyVoice();
    const language = requireStudyAudioLanguage(
      access.collection.langLearning,
      `vocabulary collection ${String(access.collection.id)}`,
    );
    const contentHash = buildStudyAudioHash({ text: word.word, language });
    const cached = await teacherVocabularyRepository.findWordAudio(
      word.id,
      voice,
      language,
      contentHash,
    );
    if (cached !== undefined) {
      logger.debug({ wordId, voice, language }, "Study audio cache hit for vocabulary word");
      return success({
        audioUrl: buildS3FileUrl(cached.voiceSrc),
        voiceSrc: cached.voiceSrc,
      });
    }
    logger.debug({ wordId, voice, language }, "Study audio cache miss for vocabulary word");
    const legacy = await teacherVocabularyRepository.findLegacyWordAudio(word.id, voice);
    if (legacy !== undefined) {
      await teacherVocabularyRepository.setWordAudio(
        word.id,
        voice,
        language,
        contentHash,
        legacy.voiceSrc,
      );
      // During rollout we intentionally keep referencing the legacy S3 object here.
      logger.info({ wordId, voice, language }, "Study audio bridged from legacy vocabulary word cache");
      return success({
        audioUrl: buildS3FileUrl(legacy.voiceSrc),
        voiceSrc: legacy.voiceSrc,
      });
    }
    const lockKey = buildStudyAudioLookupKey({
      scope: "vocabulary_word",
      scopeId: word.id,
      voice,
      language,
      contentHash,
    });
    const entityKey = buildStudyAudioEntityKey({
      scope: "vocabulary_word",
      scopeId: word.id,
      voice,
      language,
      contentHash,
    });
    const audioUrl = await synthesizeStudyAudioToUrl(
      lockKey,
      entityKey,
      word.word,
      voice,
      language,
    );
    await teacherVocabularyRepository.setWordAudio(
      word.id,
      voice,
      language,
      contentHash,
      entityKey,
    );
    grokUsageService.record({
      userId,
      voice,
      language,
      feature: "TEACHER_VOCABULARY",
      characterCount: word.word.length,
    });
    return success({ audioUrl, voiceSrc: entityKey });
  },

  async getExampleAudio(
    userId: bigint,
    exampleId: string,
  ): Promise<ServiceResult<{ audioUrl: string; voiceSrc: string }>> {
    const example = await teacherVocabularyRepository.findExampleById(
      BigInt(exampleId),
    );
    if (example === undefined) {
      return failure("NOT_FOUND", "Vocabulary example not found");
    }
    const word = await teacherVocabularyRepository.findWordById(example.wordId);
    if (word === undefined) {
      return failure("NOT_FOUND", "Vocabulary word not found");
    }
    const access = await assertUserHasVocabularyCollection(
      userId,
      word.collectionId,
    );
    if (!access.ok) {
      return failure(
        "UNAUTHORIZED",
        "Vocabulary example does not belong to this user",
      );
    }
    const voice = resolveStudyVoice();
    const language = requireStudyAudioLanguage(
      access.collection.langLearning,
      `vocabulary collection ${String(access.collection.id)}`,
    );
    const contentHash = buildStudyAudioHash({ text: example.sentence, language });
    const cached = await teacherVocabularyRepository.findExampleAudio(
      example.id,
      voice,
      language,
      contentHash,
    );
    if (cached !== undefined) {
      logger.debug({ exampleId, voice, language }, "Study audio cache hit for vocabulary example");
      return success({
        audioUrl: buildS3FileUrl(cached.voiceSrc),
        voiceSrc: cached.voiceSrc,
      });
    }
    logger.debug({ exampleId, voice, language }, "Study audio cache miss for vocabulary example");
    const legacy = await teacherVocabularyRepository.findLegacyExampleAudio(example.id, voice);
    if (legacy !== undefined) {
      await teacherVocabularyRepository.setExampleAudio(
        example.id,
        voice,
        language,
        contentHash,
        legacy.voiceSrc,
      );
      // During rollout we intentionally keep referencing the legacy S3 object here.
      logger.info({ exampleId, voice, language }, "Study audio bridged from legacy vocabulary example cache");
      return success({
        audioUrl: buildS3FileUrl(legacy.voiceSrc),
        voiceSrc: legacy.voiceSrc,
      });
    }
    const lockKey = buildStudyAudioLookupKey({
      scope: "vocabulary_example",
      scopeId: example.id,
      voice,
      language,
      contentHash,
    });
    const entityKey = buildStudyAudioEntityKey({
      scope: "vocabulary_example",
      scopeId: example.id,
      voice,
      language,
      contentHash,
    });
    const audioUrl = await synthesizeStudyAudioToUrl(
      lockKey,
      entityKey,
      example.sentence,
      voice,
      language,
    );
    await teacherVocabularyRepository.setExampleAudio(
      example.id,
      voice,
      language,
      contentHash,
      entityKey,
    );
    grokUsageService.record({
      userId,
      voice,
      language,
      feature: "TEACHER_VOCABULARY",
      characterCount: example.sentence.length,
    });
    return success({ audioUrl, voiceSrc: entityKey });
  },

  async recordWordPractice(
    userId: bigint,
    wordId: string,
    payload: {
      isCorrect?: boolean;
      pronunciationScore?: number;
      recognitionScore?: number;
    },
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof teacherVocabularyProgressTransformer.serialize>;
    }>
  > {
    const word = await teacherVocabularyRepository.findWordById(BigInt(wordId));
    if (word === undefined) {
      return failure("NOT_FOUND", "Vocabulary word not found");
    }
    const access = await assertUserHasVocabularyCollection(
      userId,
      word.collectionId,
    );
    if (!access.ok) {
      return failure(
        "UNAUTHORIZED",
        "Vocabulary word does not belong to this user",
      );
    }
    const practicePayload: {
      isCorrect: boolean;
      pronunciationScore?: number;
      recognitionScore?: number;
    } = {
      isCorrect: payload.isCorrect === true,
    };
    if (payload.pronunciationScore !== undefined) {
      practicePayload.pronunciationScore = payload.pronunciationScore;
    }
    if (payload.recognitionScore !== undefined) {
      practicePayload.recognitionScore = payload.recognitionScore;
    }
    const updated = await teacherVocabularyRepository.incrementPracticeStats(
      userId,
      word.id,
      practicePayload,
    );
    if (updated === undefined) {
      return failure("INTERNAL", "Failed to update vocabulary progress");
    }
    return success({
      data: teacherVocabularyProgressTransformer.serialize(updated),
    });
  },

  async deleteVocabularyCollection(
    userId: bigint,
    collectionId: string,
  ): Promise<ServiceResult<{ stats: { total: number; mastered: number; reviewing: number; learning: number; newWords: number } }>> {
    const access = await assertUserHasVocabularyCollection(
      userId,
      BigInt(collectionId),
    );
    if (!access.ok) {
      return access.result;
    }
    const { collection } = access;
    const langLearning = collection.langLearning;
    const wordIds = (
      await teacherVocabularyRepository.findWordsByCollectionId(collection.id)
    ).map((word) => word.id);
    await Promise.all([
      teacherVocabularyRepository.deleteProgressByUserAndWordIds(
        userId,
        wordIds,
      ),
      // Shared study audio stays alive after detach; reclaim for unused collections is a later cleanup pass.
      teacherVocabularyRepository.detachCollectionFromUser(
        userId,
        collection.id,
      ),
    ]);
    const stats = await teacherVocabularyRepository.getVocabularyStats({ userId, langLearning });
    return success({ stats });
  },
};
