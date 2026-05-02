import logger from "#logger";
import { xaiTextAdapter } from "#app/services/ai/adapters/xai-text-adapter.js";
import type { TextUsageCompleteHandler } from "#app/services/ai/types.js";
import { actionRegistry } from "#app/services/actions/registry.js";
import type { ActionContext } from "#app/services/actions/types.js";
import {
  buildLearnerSettingsPromptBlock,
  type LearnerSettingsPromptContext,
} from "#app/services/learner-settings-prompt.js";
import { promptService } from "#app/services/prompt-service.js";
import { resolveLanguageName } from "shared/enums";
import type { TeacherProfileRow } from "#app/repositories/teacher-repository.js";
import type {
  TeacherFactRow,
  TeacherLessonRow,
  TeacherChatMessageRow,
} from "#app/repositories/teacher-repository.js";
import type {
  KnownVocabularyPromptContext,
  KnownVocabularyPromptItem,
} from "#app/services/teacher-known-vocabulary-context.js";
import { normalizeTeacherVocabularyWord } from "./teacher-vocabulary-normalization.js";

export interface LessonResult {
  content: string;
  vocabulary: { word: string; translation: string; example: string }[];
  grammarNotes: string;
  homework: string;
  newFacts: string[];
  levelGuess: string;
  interests: string[];
}

interface ActiveLessonContext {
  id: string;
  content: string;
  vocabularyWords: string[];
}

export interface VocabularyExampleResult {
  sentence: string;
  translation: string;
}

export interface VocabularyItemResult {
  word: string;
  translation: string;
  transcription: string;
  partOfSpeech: string;
  examples: VocabularyExampleResult[];
}

export interface VocabularyIntentResult {
  intent: "create_vocabulary" | "ask_topic" | "none";
  topic?: string;
  description?: string;
  reply?: string;
}

// resolveLanguageName imported from shared/enums

const DEFAULT_TEACHER_VOCABULARY_SYSTEM_PROMPT = [
  "You are a professional language teacher.",
  "Return valid JSON only.",
  "Return an object with a single `items` array.",
  "Generate practical, high-frequency vocabulary for {langLearning} learners.",
  "The learner native language is {langNative}.",
  "The learner level is {levelCode}.",
].join(" ");
const TEACHER_VOCABULARY_TARGET_COUNT = 20;
const TEACHER_VOCABULARY_MAX_ATTEMPTS = 32;
const TEACHER_VOCABULARY_GENERATION_DELAY_MS = 350;

const DEFAULT_TEACHER_APP_CAPABILITIES_PROMPT = [
  "You are an in-app AI language teacher inside a language learning application.",
  "You must stay grounded in the real capabilities of this app and never imply features that do not exist.",
  "Teacher chat: you can have short ongoing chat conversations with the student inside the app and continue previous conversations when chat history is available.",
  "Personalized teaching: the app stores the student's learning language, native language, proficiency level, learning goal, profile context, and previously extracted facts, and you should adapt explanations, examples, difficulty, and tasks to that information.",
  "Lesson support: the app can generate lessons based on previous translated conversations, and when recent or active lessons are available you should continue practicing related topics and prioritize that lesson vocabulary.",
  "Vocabulary training: the app can generate vocabulary collections for a topic or goal, so you can help with useful words, short phrases, examples, translations, and practical exercises.",
  "Translation context: the app also has a translator workflow, and translated conversations may be used as valid learning context for lessons and chat.",
  "Audio and voice interaction: your responses may be read aloud with text-to-speech and the student may interact by voice, so your answers should be natural, clear, and not overly long.",
  "You must not claim that you can browse the internet, open websites, send links, access external tools, or perform actions outside the app.",
  "If the student asks for something outside the app capabilities, politely say you cannot do that here and offer the closest useful in-app help instead.",
  "Stay in the role of an in-app teacher, not a general assistant.",
  "Be practical, specific, action-oriented, and consistent with the current lesson, vocabulary, chat history, and learner profile.",
  "Action tools: you have access to tools that let you perform real in-app actions for the student. The exact tool names and descriptions are provided separately.",
  "IMPORTANT RULES for using tools:",
  "1. For vocabulary: never reuse a topic from previous chat history, previous lessons, or earlier vocabulary requests unless the student explicitly names that same topic again in the current message.",
  "2. If the student wants a vocabulary/dictionary/word collection but the current message does not explicitly specify the topic, ask only for the topic first.",
  "3. As soon as the student clearly wants the vocabulary and the topic is explicitly known from the current message, immediately call the propose_vocabulary tool.",
  "4. Do not ask for an extra textual confirmation before calling the vocabulary tool.",
  "5. After a tool call succeeds, tell the student that a Create/Cancel card appeared directly in the teacher chat.",
].join(" ");

function buildTeacherAppCapabilitiesPrompt(): string {
  const prompt = promptService.getContent("TEACHER_APP_CAPABILITIES");
  return prompt.length > 0 ? prompt : DEFAULT_TEACHER_APP_CAPABILITIES_PROMPT;
}

function parseVocabularyItem(item: unknown): VocabularyItemResult | null {
  if (typeof item !== "object" || item === null) return null;
  const obj = item as Record<string, unknown>;
  const examples = Array.isArray(obj["examples"])
    ? (obj["examples"] as unknown[])
        .map((example) => {
          if (typeof example !== "object" || example === null) return null;
          const ex = example as Record<string, unknown>;
          return {
            sentence:
              typeof ex["sentence"] === "string" ? ex["sentence"].trim() : "",
            translation:
              typeof ex["translation"] === "string"
                ? ex["translation"].trim()
                : "",
          };
        })
        .filter(
          (example): example is VocabularyExampleResult =>
            example !== null &&
            example.sentence.length > 0 &&
            example.translation.length > 0,
        )
        .slice(0, 3)
    : [];
  const word = typeof obj["word"] === "string" ? obj["word"].trim() : "";
  const translation =
    typeof obj["translation"] === "string" ? obj["translation"].trim() : "";
  if (word.length === 0 || translation.length === 0) return null;
  return {
    word,
    translation,
    transcription:
      typeof obj["transcription"] === "string"
        ? obj["transcription"].trim()
        : "",
    partOfSpeech:
      typeof obj["partOfSpeech"] === "string"
        ? obj["partOfSpeech"].trim()
        : "",
    examples,
  };
}

function extractBalancedObjectStrings(input: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] ?? "";
    const prev = i > 0 ? input[i - 1] : "";
    if (ch === '"' && prev !== "\\") {
      inString = !inString;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        result.push(input.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return result;
}

function parseVocabularySingleWithFallback(raw: string): VocabularyItemResult | null {
  const match = /\{[\s\S]*\}/.exec(raw);
  const jsonStr = match !== null ? match[0] : raw;
  const sanitized = sanitizeJsonText(jsonStr);

  try {
    const parsed = JSON.parse(sanitized) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const item = (parsed as Record<string, unknown>)["item"];
    return parseVocabularyItem(item);
  } catch (error) {
    logger.warn(
      { err: error },
      "Teacher: vocabulary single-item JSON parse failed, trying fallback object extraction",
    );
  }

  const objectStrings = extractBalancedObjectStrings(sanitized);
  for (const objectString of objectStrings) {
    try {
      const parsed = JSON.parse(sanitizeJsonText(objectString)) as unknown;
      const parsedItem = parseVocabularyItem(parsed);
      if (parsedItem !== null) return parsedItem;
      if (typeof parsed === "object" && parsed !== null) {
        const nested = parseVocabularyItem((parsed as Record<string, unknown>)["item"]);
        if (nested !== null) return nested;
      }
    } catch {
      // continue
    }
  }

  return null;
}

function parseVocabularyIntent(raw: string): VocabularyIntentResult {
  const match = /\{[\s\S]*\}/.exec(raw);
  const jsonStr = match !== null ? match[0] : raw;
  const parsed = JSON.parse(sanitizeJsonText(jsonStr)) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    return { intent: "none" };
  }
  const obj = parsed as Record<string, unknown>;
  const intentValue = typeof obj["intent"] === "string" ? obj["intent"] : "none";
  const intent =
    intentValue === "create_vocabulary" || intentValue === "ask_topic" || intentValue === "none"
      ? intentValue
      : "none";
  const topic = typeof obj["topic"] === "string" ? obj["topic"].trim() : "";
  const description = typeof obj["description"] === "string" ? obj["description"].trim() : "";
  const reply = typeof obj["reply"] === "string" ? obj["reply"].trim() : "";

  return {
    intent,
    ...(topic.length > 0 ? { topic } : {}),
    ...(description.length > 0 ? { description } : {}),
    ...(reply.length > 0 ? { reply } : {}),
  };
}

function sanitizeJsonText(input: string): string {
  let sanitized = "";
  let inString = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i] ?? "";
    if (ch === "\\" && inString) {
      sanitized += ch + (input[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (ch === "\"") {
      inString = !inString;
      sanitized += ch;
    } else if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === "\n") sanitized += "\\n";
      else if (ch === "\r") sanitized += "\\r";
      else if (ch === "\t") sanitized += "\\t";
    } else {
      sanitized += ch;
    }
    i++;
  }
  return sanitized
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTeacherPersona(
  langLearning: string,
  langNative: string,
  teacherName: string,
  teacherGender: string,
  learnerSettings?: LearnerSettingsPromptContext,
): string {
  const learningName = resolveLanguageName(langLearning);
  const nativeName = resolveLanguageName(langNative);
  const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);
  const appCapabilitiesBlock = buildTeacherAppCapabilitiesPrompt();
  const base = promptService.getContent("TEACHER_SYSTEM");
  if (base.length > 0) {
    return [
      base
      .replace(/\{langLearning\}/g, learningName)
      .replace(/\{langNative\}/g, nativeName)
      .replace(/\{teacherName\}/g, teacherName)
      .replace(/\{teacherGender\}/g, teacherGender),
      appCapabilitiesBlock,
      learnerSettingsBlock,
    ].filter((part) => part.length > 0).join("\n\n");
  }
  return [
    `Act as ${teacherName}, a 26-year-old ${teacherGender} energetic ${learningName} language teacher.`,
    `You are a young teacher and also a supportive, funny, and attentive friend for the student.`,
    `Your communication style is modern, natural, witty, and sometimes lightly meme-aware, but never forced, repetitive, or overplayed.`,
    `Always reply in ${nativeName}, while naturally integrating one or two words in ${learningName} when it genuinely helps learning.`,
    `Treat the student like a real person with their own life, mood, goals, and interests. Show real curiosity about them, but keep it natural.`,
    `Keep responses short and chat-like: usually 1 sentence, sometimes 2 if needed. Your messages should feel fast, human, and conversational.`,
    `Do not repeat yourself. Avoid repeating the same sentence openings, question patterns, praise phrases, jokes, corrections, or teaching formulas across nearby messages.`,
    `Praise the student only when it feels deserved and natural. Do not praise in every reply. Vary your tone: sometimes warm, sometimes playful, sometimes calm, sometimes focused.`,
    `Strictly forbidden: do not use emojis, emoticons, or Markdown formatting. Do not send links or URLs. Do not invent app features, external tools, or internet access.`,
    `Greeting rule: only greet at the very beginning of a new dialogue. Do not greet again once the conversation is already ongoing.`,
    `Language rule: never use abbreviations for language names such as "en", "ru", or "es". Always use full language names.`,
    `Context rule: maintain awareness of the current conversation and avoid asking the same type of question twice in a row unless there is a clear reason.`,
    `Teaching behavior: when useful, help through tiny natural learning moments: a short correction, a better phrasing, one useful word, one small example, or one quick practice prompt.`,
    `Final response rule: every message must end with exactly one of the following: 1. A question. 2. A request for the student to repeat one specific phrase, with a short explanation of its meaning and usage context.`,
    `Never combine both in the same message.`,
    appCapabilitiesBlock,
    learnerSettingsBlock,
  ].filter((part) => part.length > 0).join(" ");
}

function buildFirstChatPersona(
  langLearning: string,
  langNative: string,
  teacherName: string,
  teacherGender: string,
  learnerSettings?: LearnerSettingsPromptContext,
): string {
  const learningName = resolveLanguageName(langLearning);
  const nativeName = resolveLanguageName(langNative);
  const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);
  const appCapabilitiesBlock = buildTeacherAppCapabilitiesPrompt();
  const base = promptService.getContent("TEACHER_FIRST_CHAT");
  if (base.length > 0) {
    return [
      base
      .replace(/\{langLearning\}/g, learningName)
      .replace(/\{langNative\}/g, nativeName)
      .replace(/\{teacherName\}/g, teacherName)
      .replace(/\{teacherGender\}/g, teacherGender),
      appCapabilitiesBlock,
      learnerSettingsBlock,
    ].filter((part) => part.length > 0).join("\n\n");
  }
  return [
    `Act as ${teacherName}, a 26-year-old ${teacherGender} energetic ${learningName} language teacher.`,
    `You are a young teacher and also a supportive, funny, and attentive friend for the student.`,
    `This is the very beginning of a new dialogue with the student. Your goal is to start a warm, natural, and engaging first conversation, while learning important information about the student step by step.`,
    `Your communication style is modern, natural, witty, and sometimes lightly meme-aware, but never forced, repetitive, or overplayed.`,
    `Always reply in ${nativeName}, while naturally integrating one or two words in ${learningName} when it genuinely helps learning.`,
    `Treat the student like a real person with their own life, mood, goals, and interests. Show real curiosity about them, but keep it natural.`,
    `Keep responses short and chat-like: usually 1 sentence, sometimes 2 if needed. Your messages should feel fast, human, and conversational.`,
    `Do not repeat yourself. Avoid repeating the same sentence openings, question patterns, praise phrases, jokes, or teaching formulas across nearby messages.`,
    `Praise the student only when it feels deserved and natural. Do not praise in every reply. Vary your tone: sometimes warm, sometimes playful, sometimes calm, sometimes curious.`,
    `Strictly forbidden: do not use emojis, emoticons, or Markdown formatting. Do not send links or URLs. Do not invent app features, external tools, or internet access.`,
    `Greeting rule: this is a first conversation, so you may greet the student naturally at the start of the dialogue, but do not keep greeting again in later replies.`,
    `Language rule: never use abbreviations for language names such as "en", "ru", or "es". Always use full language names.`,
    `First-chat strategy: during the first conversation, gradually learn useful personal context about the student, such as their name, age, where they live, interests, current level, and why they want to learn ${learningName}.`,
    `Do this naturally, one step at a time, without sounding like a survey or checklist. Do not ask multiple questions at once.`,
    `Teaching behavior: even in the first chat, you may gently introduce tiny learning moments when natural: one simple word, one short phrase, one small correction, or one useful example.`,
    `Final response rule: every message must end with exactly one question.`,
    `Do not end first-chat messages with a phrase repetition task unless the conversation clearly calls for it.`,
    `Do not combine multiple questions in one message.`,
    appCapabilitiesBlock,
    learnerSettingsBlock,
  ].filter((part) => part.length > 0).join(" ");
}

function buildTeacherChatRules(isFirstReply: boolean): string {
  return [
    "Reply strictly with one short sentence as in a chat.",
    "Do not use emojis, smileys, or markdown formatting.",
    "If the user asks for an internet link, refuse: sending links is not allowed.",
    "Consider the current dialogue context and do not repeat what has already been said.",
    isFirstReply
      ? "This is the first reply in the chat: you may briefly greet once."
      : "Do not start the reply with a greeting if the dialogue has already begun.",
  ].join(" ");
}

function buildActiveLessonContextBlock(
  activeLessonContext?: ActiveLessonContext,
): string {
  if (activeLessonContext === undefined) return "";

  const vocabularyList = activeLessonContext.vocabularyWords
    .map((word, index) => `${String(index + 1)}. ${word}`)
    .join("\n");

  const vocabularyInstruction =
    activeLessonContext.vocabularyWords.length > 0
      ? `When giving tasks and examples, prioritize using words from this lesson first.\nLesson words:\n${vocabularyList}`
      : "When giving tasks, base them on the content of this lesson.";

  return [
    `Active lesson (id=${activeLessonContext.id}):`,
    activeLessonContext.content,
    vocabularyInstruction,
  ].join("\n");
}

export function buildKnownVocabularyContextBlock(
  knownVocabularyContext?: KnownVocabularyPromptContext,
): string {
  if (knownVocabularyContext === undefined) return "";

  const sections: string[] = [];
  const mastered = formatKnownVocabularyItems(knownVocabularyContext.mastered);
  const reviewing = formatKnownVocabularyItems(knownVocabularyContext.reviewing);
  const learning = formatKnownVocabularyItems(knownVocabularyContext.learning);

  if (mastered.length > 0) {
    sections.push(
      [
        "Mastered. You may freely reuse these words in natural examples and questions:",
        mastered,
      ].join("\n"),
    );
  }
  if (reviewing.length > 0) {
    sections.push(
      [
        "Reviewing. Prefer these for light repetition when relevant:",
        reviewing,
      ].join("\n"),
    );
  }
  if (learning.length > 0) {
    sections.push(
      [
        "Learning. Use sparingly, with context clues that hint at meaning:",
        learning,
      ].join("\n"),
    );
  }

  if (sections.length === 0) return "";

  return [
    "Student known vocabulary:",
    "",
    sections.join("\n\n"),
    "",
    "Rules:",
    "- Use known vocabulary naturally, not in every message.",
    "- Usually include no more than 0-1 known words in a short chat response.",
    "- Use up to 2 known words only when the student asks for a vocabulary exercise.",
    "- Prefer mastered and reviewing words.",
    "- Do not assume learning/new words are already fully known.",
    "- For learning words, prefer natural context clues over explicit translations.",
    "- Add a translation only when the student seems confused or explicitly asks.",
    "- If the active lesson has vocabulary, prioritize active lesson words first.",
  ].join("\n");
}

function formatKnownVocabularyItems(items: KnownVocabularyPromptItem[]): string {
  return items
    .map((item) => `${item.word} (${item.translation})`)
    .join(", ");
}

function buildStudentContext(
  profile: TeacherProfileRow | undefined,
  facts: TeacherFactRow[],
): string {
  if (profile === undefined && facts.length === 0) return "";

  const lines: string[] = [];
  if (profile !== undefined) {
    lines.push(`Student level: ${profile.level}`);
    lines.push(`Total lessons: ${String(profile.totalLessons)}`);
    lines.push(`Known words: ${String(profile.totalWords)}`);
    if (Array.isArray(profile.interests) && profile.interests.length > 0) {
      lines.push(`Interests: ${profile.interests.join(', ')}`);
    }
    if (profile.summary !== null && profile.summary.trim().length > 0) {
      lines.push(`Student context: ${profile.summary}`);
    }
  }
  if (facts.length > 0) {
    lines.push(`Facts about the student: ${facts.map((f) => f.fact).join("; ")}`);
  }

  return lines.join("\n");
}

function ensureTeacherXaiConfigured(): void {
  if (!xaiTextAdapter.isConfigured()) {
    throw new Error("XAI_API_KEY is required for teacher LLM flows");
  }
}

function resolveTeacherModelOverride(
  promptModel?: string | null,
): string | undefined {
  if (promptModel === null || promptModel === undefined) {
    return undefined;
  }

  const trimmed = promptModel.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.toLowerCase().includes("grok")) {
    return trimmed;
  }

  logger.warn(
    { promptModel: trimmed, fallbackModel: xaiTextAdapter.model },
    "Teacher LLM: ignoring non-XAI prompt model override",
  );
  return undefined;
}

async function callLlmOnce(
  systemPrompt: string,
  userPrompt: string,
  onComplete?: TextUsageCompleteHandler,
  promptModel?: string | null,
  temperature = 0.5,
  maxOutputTokens = 2000,
): Promise<string> {
  ensureTeacherXaiConfigured();
  const modelOverride = resolveTeacherModelOverride(promptModel);
  const gen = xaiTextAdapter.streamText(
    {
      systemPrompt,
      userPrompt,
      temperature,
      maxOutputTokens,
      modelOverride,
    },
    onComplete,
  );
  let result = "";
  for await (const chunk of gen) {
    result += chunk;
  }
  return result;
}

export const teacherLlmService = {
  async generateLesson(
    conversationLines: string[],
    langLearning: string,
    langNative: string,
    profile: TeacherProfileRow | undefined,
    facts: TeacherFactRow[],
    teacherName: string,
    teacherGender: string,
    learnerSettings?: LearnerSettingsPromptContext,
    onComplete?: TextUsageCompleteHandler,
  ): Promise<LessonResult | null> {
    const studentCtx = buildStudentContext(profile, facts);
    const learningName = resolveLanguageName(langLearning);
    const nativeName = resolveLanguageName(langNative);
    const lessonBase = promptService.getContent("TEACHER_LESSON");
    const lessonInstruction =
      lessonBase.length > 0
        ? lessonBase
            .replace(/\{langNative\}/g, nativeName)
            .replace(/\{langLearning\}/g, learningName)
            .replace(/\{teacherName\}/g, teacherName)
            .replace(/\{teacherGender\}/g, teacherGender)
        : [
            `\n\nAnalyze the dialogue and return JSON (no markdown, only the object):`,
            `{"content":"brief lesson description in ${nativeName}","vocabulary":[{"word":"word in ${learningName}","translation":"translation in ${nativeName}","example":"example sentence"}],"grammarNotes":"grammar notes","homework":"homework assignment","newFacts":["facts about the student from the dialogue"],"levelGuess":"a1/a2/b1/b2/c1/c2","interests":["topics from the conversation"]}`,
          ].join("");
    const systemPrompt = [
      buildTeacherPersona(langLearning, langNative, teacherName, teacherGender, learnerSettings),
      studentCtx.length > 0 ? `\n\nStudent information:\n${studentCtx}` : "",
      lessonInstruction,
    ].join("");

    const userPrompt = `Dialogue:\n${conversationLines.join("\n")}`;

    try {
      const teacherModel = promptService.getModel("TEACHER_LESSON") ?? promptService.getModel("TEACHER_SYSTEM");
      const teacherTemperature =
        promptService.getTemperature("TEACHER_LESSON") ??
        promptService.getTemperature("TEACHER_SYSTEM") ??
        0.5;
      const teacherMaxTokens =
        promptService.getMaxTokens("TEACHER_LESSON") ??
        promptService.getMaxTokens("TEACHER_SYSTEM") ??
        2000;
      const raw = await callLlmOnce(
        systemPrompt,
        userPrompt,
        onComplete,
        teacherModel,
        teacherTemperature,
        teacherMaxTokens,
      );
      const match = /\{[\s\S]*\}/.exec(raw);
      const jsonStr = match !== null ? match[0] : raw;
      // Escape literal control characters that appear inside JSON string values
      let sanitized = '';
      let inString = false;
      let i = 0;
      while (i < jsonStr.length) {
        const ch = jsonStr[i] ?? '';
        if (ch === '\\' && inString) {
          sanitized += ch + (jsonStr[i + 1] ?? '');
          i += 2;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          sanitized += ch;
        } else if (inString && ch.charCodeAt(0) < 0x20) {
          if (ch === '\n') sanitized += '\\n';
          else if (ch === '\r') sanitized += '\\r';
          else if (ch === '\t') sanitized += '\\t';
          // other control chars are dropped
        } else {
          sanitized += ch;
        }
        i++;
      }
      const parsed = JSON.parse(sanitized) as unknown;
      if (typeof parsed !== "object" || parsed === null) return null;
      const obj = parsed as Record<string, unknown>;

      return {
        content: typeof obj["content"] === "string" ? obj["content"] : "",
        vocabulary: Array.isArray(obj["vocabulary"])
          ? (obj["vocabulary"] as {
              word: string;
              translation: string;
              example: string;
            }[])
          : [],
        grammarNotes:
          typeof obj["grammarNotes"] === "string" ? obj["grammarNotes"] : "",
        homework: typeof obj["homework"] === "string" ? obj["homework"] : "",
        newFacts: Array.isArray(obj["newFacts"])
          ? (obj["newFacts"] as string[]).filter(
              (f): f is string => typeof f === "string",
            )
          : [],
        levelGuess:
          typeof obj["levelGuess"] === "string" ? obj["levelGuess"] : "a1",
        interests: Array.isArray(obj["interests"])
          ? (obj["interests"] as string[]).filter(
              (i): i is string => typeof i === "string",
            )
          : [],
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to parse teacher lesson JSON");
      return null;
    }
  },

  async detectVocabularyIntent(
    userMessage: string,
    langLearning: string,
    langNative: string,
    chatHistory: TeacherChatMessageRow[],
    teacherName: string,
    teacherGender: string,
    learnerSettings?: LearnerSettingsPromptContext,
    onComplete?: TextUsageCompleteHandler,
  ): Promise<VocabularyIntentResult> {
    const persona = buildTeacherPersona(
      langLearning,
      langNative,
      teacherName,
      teacherGender,
      learnerSettings,
    );
    const historyText = chatHistory
      .slice(-12)
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");
    const systemPrompt = [
      `You classify whether the student's latest message is a request to create a vocabulary collection in the app.`,
      `Return valid JSON only.`,
      `JSON format: {"intent":"create_vocabulary"|"ask_topic"|"none","topic":"string","description":"string","reply":"string"}.`,
      `Choose "create_vocabulary" only when the student is clearly asking to create/save/generate a vocabulary, dictionary, or word list in the app and the topic is specific enough.`,
      `Choose "ask_topic" only when the student clearly wants a vocabulary collection but the topic is still missing or too vague.`,
      `Choose "none" for everything else.`,
      `Never reuse a topic from older chat history unless the student's latest message explicitly confirms that topic.`,
      `If intent is "create_vocabulary":`,
      `- topic must be short and specific`,
      `- description must be 10-240 chars and explain the learning goal`,
      `- reply must briefly say that a Create/Cancel card appeared in the chat`,
      `If intent is "ask_topic":`,
      `- reply must ask only one short question about the topic`,
      `If intent is "none":`,
      `- leave topic/description/reply empty`,
      `Teacher persona context: ${persona}`,
    ].join("\n");
    const userPrompt = [
      "Recent chat history:",
      historyText.length > 0 ? historyText : "none",
      "",
      `Latest student message: ${userMessage}`,
    ].join("\n");

    try {
      const teacherModel = promptService.getModel("TEACHER_SYSTEM");
      const teacherTemperature =
        promptService.getTemperature("TEACHER_SYSTEM") ?? 0.2;
      const teacherMaxTokens =
        promptService.getMaxTokens("TEACHER_SYSTEM") ?? 300;
      const raw = await callLlmOnce(
        systemPrompt,
        userPrompt,
        onComplete,
        teacherModel,
        teacherTemperature,
        teacherMaxTokens,
      );
      const parsed = parseVocabularyIntent(raw);
      logger.info(
        {
          intent: parsed.intent,
          topic: parsed.topic ?? null,
          hasDescription: parsed.description !== undefined,
          hasReply: parsed.reply !== undefined,
          rawLength: raw.length,
        },
        "Teacher: vocabulary intent detection result",
      );
      return parsed;
    } catch (error) {
      logger.warn({ err: error }, "Teacher: detectVocabularyIntent failed");
      return { intent: "none" };
    }
  },

  async *chatStream(
    userMessage: string,
    langLearning: string,
    langNative: string,
    profile: TeacherProfileRow | undefined,
    facts: TeacherFactRow[],
    chatHistory: TeacherChatMessageRow[],
    recentLessons: TeacherLessonRow[],
    teacherName: string,
    teacherGender: string,
    learnerSettings?: LearnerSettingsPromptContext,
    activeLessonContext?: ActiveLessonContext,
    knownVocabularyContext?: KnownVocabularyPromptContext,
    isFirstChat?: boolean,
    onComplete?: TextUsageCompleteHandler,
    actionCtx?: ActionContext,
  ): AsyncGenerator<string, void, undefined> {
    logger.info({ hasActionCtx: actionCtx !== undefined, toolCount: actionCtx !== undefined ? actionRegistry.describeTools().length : 0 }, "chatStream: entry");
    const studentCtx = buildStudentContext(profile, facts);
    const chatRules = buildTeacherChatRules(chatHistory.length === 0);
    const activeLessonBlock =
      buildActiveLessonContextBlock(activeLessonContext);
    const knownVocabularyBlock =
      buildKnownVocabularyContextBlock(knownVocabularyContext);

    const lessonSummaries = recentLessons
      .slice(0, 5)
      .map((l, i) => `[Lesson ${String(i + 1)}] ${l.content.slice(0, 200)}`)
      .join("\n");

    const persona =
      isFirstChat === true
        ? buildFirstChatPersona(langLearning, langNative, teacherName, teacherGender, learnerSettings)
        : buildTeacherPersona(langLearning, langNative, teacherName, teacherGender, learnerSettings);

    const systemPrompt =
      isFirstChat === true
        ? persona
        : [
            persona,
            `\n\nChat reply rules:\n${chatRules}`,
            studentCtx.length > 0
              ? `\n\nStudent information:\n${studentCtx}`
              : "",
            activeLessonBlock.length > 0
              ? `\n\nActive lesson context:\n${activeLessonBlock}`
              : "",
            knownVocabularyBlock.length > 0
              ? `\n\n${knownVocabularyBlock}`
              : "",
            lessonSummaries.length > 0
              ? `\n\nRecent lessons:\n${lessonSummaries}`
              : "",
          ].join("");

    const messages = [
      ...chatHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const chatModel = promptService.getModel(isFirstChat === true ? "TEACHER_FIRST_CHAT" : "TEACHER_SYSTEM");
    const chatPromptType = isFirstChat === true ? "TEACHER_FIRST_CHAT" : "TEACHER_SYSTEM";
    const chatTemperature =
      promptService.getTemperature(chatPromptType) ?? 0.7;
    const chatMaxTokens =
      promptService.getMaxTokens(chatPromptType) ?? 220;
    ensureTeacherXaiConfigured();
    const modelOverride = resolveTeacherModelOverride(chatModel);
    const historyText = messages
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");

    let finalSystemPrompt = systemPrompt;
    if (actionCtx !== undefined) {
      const toolLines = actionRegistry.describeTools();
      if (toolLines.length > 0) {
        finalSystemPrompt += [
          `\n\nYou have the following action tools available:`,
          ...toolLines.map((l) => `- ${l}`),
          ``,
          `TOOL CALLING RULES:`,
          `- Never reuse a vocabulary topic from previous messages, previous lessons, or earlier requests unless the student explicitly repeats that topic in the current message.`,
          `- When the student asks you to create/generate a vocabulary, dictionary, or word collection and the current message explicitly contains the topic — you MUST call the propose_vocabulary tool immediately. Do NOT just describe or promise the vocabulary in text. Actually call the tool.`,
          `- If the current message does not explicitly contain the topic, ask only one short follow-up question asking for the topic.`,
          `- Do not ask for an extra text confirmation before calling propose_vocabulary.`,
          `- After calling a tool, you MUST reply with a short text message telling the student what happened (e.g. that a Create/Cancel card appeared directly in the teacher chat).`,
          `- Never simulate or pretend you created something — always use the tool.`,
        ].join("\n");
      }
    }

    const effectiveMaxTokens = actionCtx !== undefined
      ? Math.max(chatMaxTokens, 400)
      : chatMaxTokens;

    yield* xaiTextAdapter.streamText(
      {
        systemPrompt: finalSystemPrompt,
        userPrompt: `Chat history:\n${historyText}`,
        temperature: chatTemperature,
        maxOutputTokens: effectiveMaxTokens,
        modelOverride,
        ...(actionCtx !== undefined
          ? { toolCallHandler: actionRegistry.buildToolCallHandler(actionCtx) }
          : {}),
      },
      onComplete,
    );
  },

  async *openChatStream(
    langLearning: string,
    langNative: string,
    teacherName: string,
    teacherGender: string,
    isFirstChat: boolean,
    chatHistory: TeacherChatMessageRow[],
    learnerSettings?: LearnerSettingsPromptContext,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, void, undefined> {
    const systemPrompt = isFirstChat
      ? buildFirstChatPersona(langLearning, langNative, teacherName, teacherGender, learnerSettings)
      : buildTeacherPersona(langLearning, langNative, teacherName, teacherGender, learnerSettings);
    const historyText = chatHistory
      .map((m) => `[${m.role}]: ${m.content}`)
      .join("\n");
    const openingPrompt = isFirstChat
      ? "Start the conversation with the student — greet them and introduce yourself."
      : [
          "Chat history:",
          historyText,
          "",
          "Instruction: greet the student and continue the lesson from where you left off.",
        ].join("\n");

    const openModel = isFirstChat
      ? (promptService.getModel("TEACHER_FIRST_CHAT") ?? promptService.getModel("TEACHER_SYSTEM"))
      : (promptService.getModel("TEACHER_SYSTEM") ?? promptService.getModel("TEACHER_FIRST_CHAT"));
    const openPromptType = isFirstChat ? "TEACHER_FIRST_CHAT" : "TEACHER_SYSTEM";
    const openTemperature =
      promptService.getTemperature(openPromptType) ?? 0.7;
    const openMaxTokens =
      promptService.getMaxTokens(openPromptType) ?? 220;
    ensureTeacherXaiConfigured();
    yield* xaiTextAdapter.streamText(
      {
        systemPrompt,
        userPrompt: openingPrompt,
        temperature: openTemperature,
        maxOutputTokens: openMaxTokens,
        modelOverride: resolveTeacherModelOverride(openModel),
      },
      onComplete,
    );
  },

  async extractFirstChatFacts(
    userMessage: string,
    assistantResponse: string,
    langNative: string,
    learnerSettings?: LearnerSettingsPromptContext,
    onComplete?: TextUsageCompleteHandler,
  ): Promise<string[]> {
    const nativeName = resolveLanguageName(langNative);
    const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);
    const systemPrompt = [
      `You are an analyst assistant. Extract facts about the student from the user's messages.`,
      `Facts: name, age, gender, location, language learning goal.`,
      `Return a JSON array of strings with facts in ${nativeName}. Maximum 3 facts.`,
      `If there are no facts, return an empty array. JSON only, no explanations.`,
      learnerSettingsBlock,
    ].filter((part) => part.length > 0).join(" ");
    const userPrompt = `Student message: "${userMessage}"\nMaitre response: "${assistantResponse}"`;

    try {
      const teacherModel = promptService.getModel("TEACHER_SYSTEM");
      const teacherTemperature =
        promptService.getTemperature("TEACHER_SYSTEM") ?? 0.5;
      const teacherMaxTokens =
        promptService.getMaxTokens("TEACHER_SYSTEM") ?? 2000;
      const raw = await callLlmOnce(
        systemPrompt,
        userPrompt,
        onComplete,
        teacherModel,
        teacherTemperature,
        teacherMaxTokens,
      );
      const match = /\[[\s\S]*\]/.exec(raw);
      const jsonStr = match !== null ? match[0] : "[]";
      const parsed = JSON.parse(sanitizeJsonText(jsonStr)) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (f): f is string => typeof f === "string" && f.trim().length > 0,
        )
        .slice(0, 3);
    } catch (error) {
      logger.warn({ err: error }, "Teacher: extractFirstChatFacts failed");
      return [];
    }
  },

  async generateVocabularyBatch(
    topic: string,
    description: string,
    langLearning: string,
    langNative: string,
    levelCode: string,
    existingWords: string[],
    learnerSettings?: LearnerSettingsPromptContext,
    onComplete?: TextUsageCompleteHandler,
    onProgress?: (
      generatedCount: number,
      targetCount: number,
      item: VocabularyItemResult,
    ) => Promise<void> | void,
  ): Promise<VocabularyItemResult[]> {
    const learningName = resolveLanguageName(langLearning);
    const nativeName = resolveLanguageName(langNative);
    let systemPrompt = promptService.getContent("TEACHER_VOCABULARY_SYSTEM");
    if (systemPrompt.length === 0) {
      systemPrompt = DEFAULT_TEACHER_VOCABULARY_SYSTEM_PROMPT;
    }
    systemPrompt = systemPrompt
      .replaceAll("{langLearning}", learningName)
      .replaceAll("{langNative}", nativeName)
      .replaceAll("{levelCode}", levelCode);
    const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);
    const finalSystemPrompt = [systemPrompt, learnerSettingsBlock]
      .filter((part) => part.length > 0)
      .join("\n\n");
    const exclusionList =
      existingWords.length > 0
        ? existingWords.slice(0, 200).join(", ")
        : "none";

    try {
      const teacherModel =
        promptService.getModel("TEACHER_VOCABULARY_SYSTEM") ??
        promptService.getModel("TEACHER_SYSTEM");
      const teacherTemperature =
        promptService.getTemperature("TEACHER_VOCABULARY_SYSTEM") ??
        promptService.getTemperature("TEACHER_SYSTEM") ??
        0.3;
      const teacherMaxTokens =
        promptService.getMaxTokens("TEACHER_VOCABULARY_SYSTEM") ??
        promptService.getMaxTokens("TEACHER_SYSTEM") ??
        700;

      const generatedItems: VocabularyItemResult[] = [];
      const excludedWords = [...existingWords];
      const seenNormalizedWords = new Set(
        existingWords.map((word) => normalizeTeacherVocabularyWord(word)),
      );
      let stuckWord: string | null = null;
      let stuckCount = 0;

      for (let attempt = 1; attempt <= TEACHER_VOCABULARY_MAX_ATTEMPTS; attempt++) {
        const stuckWarning =
          stuckWord !== null && stuckCount >= 2
            ? `IMPORTANT: You have suggested "${stuckWord}" ${String(stuckCount)} times already — it is strictly forbidden. Do NOT suggest it again under any circumstances. Think of a completely different word.`
            : null;

        const userPrompt = [
          `Topic: ${topic}`,
          `Learner goal for this vocabulary: ${description}`,
          `Already used or forbidden words: ${excludedWords.length > 0 ? excludedWords.slice(0, 200).join(", ") : exclusionList}`,
          stuckWarning,
          `Generate exactly 1 new unique word or short phrase for this topic.`,
          `This is item ${String(generatedItems.length + 1)} of ${String(TEACHER_VOCABULARY_TARGET_COUNT)}.`,
          "The word must be directly useful for the learner goal.",
          "Prioritize domain-specific vocabulary when the learner goal implies a specific real-world context.",
          "Do not repeat or paraphrase any previously used word or phrase.",
          "Keep every field compact and concise.",
          "Keep `word`, `translation`, `transcription`, and `partOfSpeech` short.",
          "Examples must be short and natural.",
          "Each example sentence should usually be 4-9 words.",
          `Each example translation in ${nativeName} should also be short.`,
          "Do not add explanations, notes, comments, markdown, or any text outside JSON.",
          "Return exactly one item.",
          "The item must contain:",
          "- word",
          `- translation in ${nativeName}`,
          "- transcription",
          "- partOfSpeech",
          "- examples: exactly 3 items with sentence and translation",
          'Response JSON format: {"item":{"word":"","translation":"","transcription":"","partOfSpeech":"","examples":[{"sentence":"","translation":""},{"sentence":"","translation":""},{"sentence":"","translation":""}]}}',
        ].filter((part): part is string => part !== null).join("\n");

        const raw = await callLlmOnce(
          finalSystemPrompt,
          userPrompt,
          onComplete,
          teacherModel,
          teacherTemperature,
          teacherMaxTokens,
        );
        logger.info(
          {
            topic,
            targetCount: TEACHER_VOCABULARY_TARGET_COUNT,
            attempt,
            generatedCount: generatedItems.length,
            rawLength: raw.length,
            rawResponse: raw,
          },
          "Teacher: vocabulary raw model response",
        );

        const item = parseVocabularySingleWithFallback(raw);
        if (item === null) {
          logger.warn(
            { topic, attempt },
            "Teacher: vocabulary single-item parsing returned null",
          );
        } else {
          const normalizedWord = normalizeTeacherVocabularyWord(item.word);
          if (normalizedWord.length === 0 || seenNormalizedWords.has(normalizedWord)) {
            if (normalizedWord.length > 0) {
              if (stuckWord !== null && normalizeTeacherVocabularyWord(stuckWord) === normalizedWord) {
                stuckCount++;
              } else {
                stuckWord = item.word;
                stuckCount = 1;
              }
            }
            logger.warn(
              { topic, attempt, word: item.word, stuckCount },
              "Teacher: vocabulary single-item generation returned duplicate or empty word",
            );
          } else {
            stuckWord = null;
            stuckCount = 0;
            generatedItems.push(item);
            excludedWords.push(item.word);
            seenNormalizedWords.add(normalizedWord);
            logger.info(
              {
                topic,
                attempt,
                generatedCount: generatedItems.length,
                word: item.word,
              },
              "Teacher: vocabulary single item accepted",
            );
            if (onProgress !== undefined) {
              await onProgress(
                generatedItems.length,
                TEACHER_VOCABULARY_TARGET_COUNT,
                item,
              );
            }
          }
        }

        if (generatedItems.length >= TEACHER_VOCABULARY_TARGET_COUNT) {
          break;
        }

        await delay(TEACHER_VOCABULARY_GENERATION_DELAY_MS);
      }

      if (generatedItems.length === 0) {
        throw new Error("Vocabulary generation parse failed");
      }
      return generatedItems;
    } catch (error) {
      logger.warn({ err: error }, "Teacher: vocabulary generation parse failed");
      throw new Error("Vocabulary generation parse failed");
    }
  },

  async generateSyntaxLessonJson(
    systemPrompt: string,
    userMessage: string,
    onComplete?: TextUsageCompleteHandler,
  ): Promise<string> {
    const teacherModel = promptService.getModel("TEACHER_SYNTAX_LESSON") ?? promptService.getModel("TEACHER_SYSTEM");
    const teacherTemperature =
      promptService.getTemperature("TEACHER_SYNTAX_LESSON") ??
      promptService.getTemperature("TEACHER_SYSTEM") ??
      0.5;
    const teacherMaxTokens = 4000;

    const raw = await callLlmOnce(
      systemPrompt,
      userMessage,
      onComplete,
      teacherModel,
      teacherTemperature,
      teacherMaxTokens,
    );
    return raw;
  },
};
