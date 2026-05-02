import { translatorRepository } from "#app/repositories/index.js";
import { teacherSettingsRepository } from "#app/repositories/teacher-settings-repository.js";
import {
  translatorSessionTransformer,
  translatorMessageTransformer,
} from "#app/transformers/index.js";
import { broadcastService } from "#app/services/broadcast-service.js";
import { translatorLlmService } from "#app/services/translator-llm-service.js";
import { teacherService } from "#app/services/teacher-service.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";
import { grokUsageService } from "#app/services/grok-usage-service.js";
import { promptService } from "#app/services/prompt-service.js";
import { ttsAdapter } from "#app/services/ai/ai-provider.js";
import { resolveLearnerSettingsPromptContext } from "#app/services/learner-settings-prompt.js";
import { decodeBase64AudioChunk, nextTtsSessionId } from "#app/services/teacher-tts-binary-packet.js";
import {
  TtsSentenceQueue,
  extractCompleteSentences,
  prepareTextForTts,
} from "#app/services/tts-sentence-utils.js";
import aiConfig from "#config/ai.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import translatorConfig from "#config/translator.js";
import { resolveGrokVoice } from "#app/services/ai/grok-tts-helpers.js";
import logger from "#logger";

async function processTranslatorTtsSentenceQueue(
  userId: bigint,
  userIdStr: string,
  langLearning: string,
  queue: TtsSentenceQueue,
  voice: string,
): Promise<void> {
  let globalIndex = 0;
  let totalChars = 0;
  const sessionId = nextTtsSessionId();
  try {
    for await (const sentence of queue) {
      const prepared = prepareTextForTts(sentence);
      if (prepared.length === 0) continue;
      totalChars += prepared.length;
      for await (const chunkBase64 of ttsAdapter.synthesizeStream({
        text: prepared,
        voice,
        language: langLearning,
      })) {
        const pcmBytes = decodeBase64AudioChunk(chunkBase64);
        if (pcmBytes.length === 0) continue;
        broadcastService.broadcastTranslatorTtsChunkBinary(userIdStr, {
          langLearning,
          index: globalIndex++,
          sessionId,
          pcmBytes,
        });
      }
    }
    if (totalChars > 0) {
      grokUsageService.record({
        userId,
        voice,
        language: langLearning,
        feature: "TRANSLATOR_TRANSLATE",
        characterCount: totalChars,
      });
    }
    broadcastService.broadcastMessageToUser(
      userIdStr,
      "translator_tts_complete",
      { langLearning },
    );
  } catch (error) {
    logger.error({ err: error, userIdStr }, "Translator: TTS streaming failed");
    broadcastService.broadcastMessageToUser(userIdStr, "translator_tts_error", {
      langLearning,
      message: "TTS failed",
    });
  }
}

export const translatorService = {
  async startSession(
    userId: bigint,
    langOwner?: string,
    langOpponent?: string,
  ): Promise<ServiceResult<{ sessionId: string }>> {
    const session = await translatorRepository.createSession({
      userId,
      langOwner: langOwner ?? "ru",
      langOpponent: langOpponent ?? "en",
    });

    return success({ sessionId: String(session.id) });
  },

  async translate(
    userId: bigint,
    params: {
      sessionId: string;
      side: "owner" | "opponent";
      text: string;
      sourceLang: string;
      targetLang: string;
      inputType: "voice" | "text";
    },
  ): Promise<ServiceResult<{ messageId: string }>> {
    if (params.text.length > translatorConfig.maxSourceTextLength) {
      return failure(
        "BAD_REQUEST",
        `Text exceeds max length of ${String(translatorConfig.maxSourceTextLength)}`,
      );
    }

    const sessionId = BigInt(params.sessionId);
    const session = await translatorRepository.findSessionById(sessionId);
    if (session === undefined) {
      return failure("NOT_FOUND", "Session not found");
    }
    if (session.userId !== userId) {
      return failure("UNAUTHORIZED", "Session does not belong to this user");
    }
    if (!session.isActive) {
      return failure("BAD_REQUEST", "Session is no longer active");
    }

    // Save original message with empty translation
    const message = await translatorRepository.createMessage({
      sessionId,
      side: params.side,
      sourceText: params.text,
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
      inputType: params.inputType,
    });

    const messageId = String(message.id);
    const userIdStr = String(userId);

    // Fire-and-forget streaming translation
    void (async (): Promise<void> => {
      try {
        // Get recent messages for context
        const recentMessages =
          await translatorRepository.findMessagesBySessionId(sessionId);
        const context = recentMessages
          .slice(-6)
          .filter((m) => m.translatedText !== null)
          .map(
            (m) =>
              `${m.sourceLang}→${m.targetLang}: ${m.sourceText} → ${m.translatedText ?? ""}`,
          );

        const translatePromptId =
          promptService.get("TRANSLATOR_SYSTEM")?.id ?? null;
        const settings = await teacherSettingsRepository.findByUserId(userId);
        const learnerSettings = resolveLearnerSettingsPromptContext(settings);
        const ttsEnabled = ttsAdapter.isConfigured();
        const ttsQueue = ttsEnabled ? new TtsSentenceQueue() : null;
        let sentenceAccum = "";
        if (ttsQueue !== null) {
          // owner speaks → translating to learning lang → use teacherVoice
          // opponent speaks → translating to native lang → use ownVoice
          const ttsVoice = resolveGrokVoice(
            params.side === 'owner' ? settings?.teacherVoice : settings?.ownVoice,
            aiConfig.grokTts.defaultVoice,
          );
          void processTranslatorTtsSentenceQueue(
            userId,
            userIdStr,
            params.targetLang,
            ttsQueue,
            ttsVoice,
          );
        }
        let fullText = "";
        for await (const token of translatorLlmService.translateStream(
          {
            text: params.text,
            sourceLang: params.sourceLang,
            targetLang: params.targetLang,
            context,
            learnerSettings,
          },
          (usage, model, finalPrompt) => {
            llmUsageService.recordText({
              userId,
              llmSystemPromptId: translatePromptId,
              model,
              feature: "TRANSLATOR_TRANSLATE",
              finalPrompt,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            });
          },
        )) {
          fullText += token;
          broadcastService.broadcastMessageToUser(
            userIdStr,
            "translator_token",
            {
              sessionId: params.sessionId,
              messageId,
              token,
              side: params.side,
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
            ttsQueue.push(sentenceAccum.trim());
          }
          ttsQueue.close();
        }

        // Update DB with full translation
        await translatorRepository.updateMessageTranslation(
          message.id,
          fullText,
        );

        // Broadcast completion
        broadcastService.broadcastMessageToUser(
          userIdStr,
          "translator_translated",
          {
            sessionId: params.sessionId,
            messageId,
            sourceText: params.text,
            translatedText: fullText,
            sourceLang: params.sourceLang,
            targetLang: params.targetLang,
            side: params.side,
          },
        );
      } catch (error) {
        logger.error({ err: error }, "Translation stream failed");
        broadcastService.broadcastMessageToUser(userIdStr, "translator_error", {
          sessionId: params.sessionId,
          message: "Translation failed",
        });
      }
    })();

    return success({ messageId });
  },

  async endSession(
    userId: bigint,
    sessionId: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const session = await translatorRepository.findSessionById(
      BigInt(sessionId),
    );
    if (session === undefined) {
      return failure("NOT_FOUND", "Session not found");
    }
    if (session.userId !== userId) {
      return failure("UNAUTHORIZED", "Session does not belong to this user");
    }

    const messages = await translatorRepository.findMessagesBySessionId(
      session.id,
    );

    if (messages.length === 0) {
      await translatorRepository.deleteSessionById(session.id);
      return success({ message: "Session deleted (no messages)" });
    }

    await translatorRepository.endSession(session.id);

    // Fire-and-forget: generate bilingual title/description from session messages
    const sessionIdStr = sessionId;
    const userIdStr = String(userId);
    const langOwnerVal = session.langOwner;
    const langOpponentVal = session.langOpponent;
    void (async (): Promise<void> => {
      try {
        const settings = await teacherSettingsRepository.findByUserId(userId);
        const learnerSettings = resolveLearnerSettingsPromptContext(settings);
        const summary = await translatorLlmService.generateSessionSummary(
          messages,
          langOwnerVal,
          langOpponentVal,
          learnerSettings,
          userId,
        );
        if (summary !== null) {
          await translatorRepository.updateSessionSummary(
            session.id,
            summary.titleA,
            summary.descriptionA,
            summary.titleB,
            summary.descriptionB,
          );
          // Notify the client via WebSocket
          broadcastService.broadcastMessageToUser(
            userIdStr,
            "translator_session_summary",
            {
              sessionId: sessionIdStr,
              titleOwner: summary.titleA,
              descriptionOwner: summary.descriptionA,
              titleOpponent: summary.titleB,
              descriptionOpponent: summary.descriptionB,
            },
          );
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to generate session summary");
      }
    })();

    // Fire-and-forget: generate personalized lesson for the student
    void teacherService.generateLesson(
      userId,
      session.id,
      session.langOpponent,
      session.langOwner,
    );

    return success({ message: "Session ended" });
  },

  async getSessions(
    userId: bigint,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof translatorSessionTransformer.serializeArray>;
    }>
  > {
    const sessions = await translatorRepository.findSessionsByUserId(userId);
    return success({
      data: translatorSessionTransformer.serializeArray(sessions),
    });
  },

  async getSessionMessages(
    userId: bigint,
    sessionId: string,
  ): Promise<
    ServiceResult<{
      data: ReturnType<typeof translatorMessageTransformer.serializeArray>;
    }>
  > {
    const session = await translatorRepository.findSessionById(
      BigInt(sessionId),
    );
    if (session === undefined) {
      return failure("NOT_FOUND", "Session not found");
    }
    if (session.userId !== userId) {
      return failure("UNAUTHORIZED", "Session does not belong to this user");
    }

    const messages = await translatorRepository.findMessagesBySessionId(
      session.id,
    );
    return success({
      data: translatorMessageTransformer.serializeArray(messages),
    });
  },

  async deleteAllSessions(
    userId: bigint,
  ): Promise<ServiceResult<Record<string, never>>> {
    await translatorRepository.deleteAllSessionsByUserId(userId);
    return success({});
  },

  async deleteSession(
    userId: bigint,
    sessionId: string,
  ): Promise<ServiceResult<Record<string, never>>> {
    const session = await translatorRepository.findSessionById(BigInt(sessionId));
    if (session === undefined) {
      return failure('NOT_FOUND', 'Session not found');
    }
    if (session.userId !== userId) {
      return failure('UNAUTHORIZED', 'Session does not belong to this user');
    }
    await translatorRepository.deleteSessionById(session.id);
    return success({});
  },
};
