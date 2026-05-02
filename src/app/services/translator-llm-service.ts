import translatorConfig from "#config/translator.js";
import logger from "#logger";
import { getTextAdapterForModel } from "#app/services/ai/ai-provider.js";
import type { TextUsageCompleteHandler } from "#app/services/ai/types.js";
import {
  buildLearnerSettingsPromptBlock,
  type LearnerSettingsPromptContext,
} from "#app/services/learner-settings-prompt.js";
import { promptService } from "#app/services/prompt-service.js";
import { resolveLanguageName } from "shared/enums";
import type { TranslatorMessageRow } from "#app/repositories/translator-repository.js";

interface MinimalFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  body: ReadableStream<Uint8Array> | null;
  headers: {
    get: (name: string) => string | null;
  };
}

export interface TranslateStreamOptions {
  text: string;
  sourceLang: string;
  targetLang: string;
  context?: string[];
  learnerSettings?: LearnerSettingsPromptContext;
}

function buildSystemPrompt(
  sourceLang: string,
  targetLang: string,
  learnerSettings?: LearnerSettingsPromptContext,
): string {
  const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);
  const base = promptService.getContent("TRANSLATOR_SYSTEM");
  if (base.length > 0) {
    return [
      base
      .replace(/\{sourceLang\}/g, sourceLang)
      .replace(/\{targetLang\}/g, targetLang),
      learnerSettingsBlock,
    ].filter((part) => part.length > 0).join("\n\n");
  }
  return [
    `You are a real-time interpreter. Translate the following text from ${sourceLang} to ${targetLang}.`,
    "Output ONLY the translation, no explanations, no quotes, no extra text.",
    "Preserve the original tone and meaning. If the text contains slang or colloquial speech, translate it naturally.",
    learnerSettingsBlock,
  ].filter((part) => part.length > 0).join(" ");
}

function buildUserPrompt(text: string, context?: string[]): string {
  if (context !== undefined && context.length > 0) {
    const contextStr = context
      .map((c, i) => `[${String(i + 1)}] ${c}`)
      .join("\n");
    return `Context of previous messages:\n${contextStr}\n\nTranslate: ${text}`;
  }
  return text;
}

async function* streamFromOpenAiApi(
  apiUrl: string,
  apiKey: string,
  model: string,
  opts: TranslateStreamOptions,
  temperature: number,
  maxTokens: number,
): AsyncGenerator<string, string, undefined> {
  const response = (await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(
            opts.sourceLang,
            opts.targetLang,
            opts.learnerSettings,
          ),
        },
        { role: "user", content: buildUserPrompt(opts.text, opts.context) },
      ],
      stream: true,
      temperature,
      max_tokens: maxTokens,
    }),
  })) as unknown as MinimalFetchResponse;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API error ${String(response.status)}: ${errorText.slice(0, 300)}`,
    );
  }

  if (response.body === null) {
    throw new Error("Response body is null");
  }

  const reader = (
    response.body as unknown as {
      getReader(): ReadableStreamDefaultReader<Uint8Array>;
    }
  ).getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as unknown;
          if (typeof json !== "object" || json === null) continue;
          const choices = (json as Record<string, unknown>)["choices"];
          if (!Array.isArray(choices) || choices.length === 0) continue;
          const delta = (choices[0] as Record<string, unknown>)["delta"];
          if (typeof delta !== "object" || delta === null) continue;
          const content = (delta as Record<string, unknown>)["content"];
          if (typeof content === "string" && content.length > 0) {
            fullText += content;
            yield content;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

function buildSummarySystemPrompt(
  lang: string,
  learnerSettings?: LearnerSettingsPromptContext,
): string {
  const normalizedLang =
    lang.trim().toLowerCase().split(/[-_]/)[0] ?? lang.trim().toLowerCase();
  const languageName = resolveLanguageName(normalizedLang);
  const languageInstruction =
    languageName === normalizedLang
      ? `${lang} (ISO 639-1/BCP-47 code: ${lang})`
      : `${languageName} (ISO 639-1 code: ${normalizedLang})`;
  const learnerSettingsBlock = buildLearnerSettingsPromptBlock(learnerSettings);

  const base = promptService.getContent("TRANSLATOR_SUMMARY");
  if (base.length > 0) {
    return [
      base.replace(/\{languageInstruction\}/g, languageInstruction),
      learnerSettingsBlock,
    ].filter((part) => part.length > 0).join("\n\n");
  }

  return [
    `You are a conversation analyzer. Write the response ONLY in ${languageInstruction}.`,
    "Do not switch to another language. The title and description must be in that exact language.",
    'Analyze the provided conversation transcript and return ONLY valid JSON with this exact structure: {"title":"short title max 60 chars","description":"2-3 sentence summary of what was discussed","error":null}.',
    'If the transcript is too short or cannot be meaningfully summarized, return: {"error":"reason"}.',
    "No markdown, no explanations, only the JSON object.",
    learnerSettingsBlock,
  ].filter((part) => part.length > 0).join(" ");
}

function buildSummaryUserPrompt(messages: TranslatorMessageRow[]): string {
  const lines = messages.map((m) => {
    const speaker = m.side === "owner" ? "A" : "B";
    const translation =
      m.translatedText !== null && m.translatedText.trim().length > 0
        ? ` → ${m.translatedText}`
        : "";
    return `[${speaker}] (${m.sourceLang}→${m.targetLang}) ${m.sourceText}${translation}`;
  });
  return `Conversation transcript:\n${lines.join("\n")}`;
}

async function callOpenAiApiOnce(
  apiUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const response = (await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      temperature,
      max_tokens: maxTokens,
    }),
  })) as unknown as MinimalFetchResponse;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API error ${String(response.status)}: ${errorText.slice(0, 200)}`,
    );
  }

  const json = await response.json();
  if (typeof json !== "object" || json === null)
    throw new Error("Invalid response");
  const choices = (json as Record<string, unknown>)["choices"];
  if (!Array.isArray(choices) || choices.length === 0)
    throw new Error("No choices");
  const message = (choices[0] as Record<string, unknown>)["message"];
  if (typeof message !== "object" || message === null)
    throw new Error("No message");
  const content = (message as Record<string, unknown>)["content"];
  return typeof content === "string" ? content : "";
}

export const translatorLlmService = {
  async *translateStream(
    opts: TranslateStreamOptions,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, string, undefined> {
    // Try primary text adapter first (use model from prompt if set)
    const translatorModel = promptService.getModel("TRANSLATOR_SYSTEM");
    const translatorTemperature =
      promptService.getTemperature("TRANSLATOR_SYSTEM") ?? 0.3;
    const translatorMaxTokens =
      promptService.getMaxTokens("TRANSLATOR_SYSTEM") ?? 2000;
    const translatorAdapter = getTextAdapterForModel(translatorModel);
    if (translatorAdapter.isConfigured()) {
      try {
        return yield* translatorAdapter.streamText(
          {
            systemPrompt: buildSystemPrompt(
              opts.sourceLang,
              opts.targetLang,
              opts.learnerSettings,
            ),
            userPrompt: buildUserPrompt(opts.text, opts.context),
            temperature: translatorTemperature,
            maxOutputTokens: translatorMaxTokens,
            modelOverride: translatorModel ?? undefined,
          },
          onComplete,
        );
      } catch (error) {
        logger.warn(
          { err: error },
          "LLM translation failed, falling back to OpenAI",
        );
      }
    }

    // Fallback to OpenAI
    const openaiKey = translatorConfig.openaiApiKey;
    if (openaiKey !== "") {
      return yield* streamFromOpenAiApi(
        translatorConfig.openaiApiUrl,
        openaiKey,
        translatorConfig.openaiModel,
        opts,
        translatorTemperature,
        translatorMaxTokens,
      );
    }

    throw new Error(
      "No translation API key configured (MISTRAL_API_KEY, XAI_API_KEY or OPENAI_API_KEY)",
    );
  },

  async generateSessionSummary(
    messages: TranslatorMessageRow[],
    langA: string,
    langB: string,
    learnerSettings?: LearnerSettingsPromptContext,
    userId?: bigint,
  ): Promise<{
    titleA: string;
    descriptionA: string;
    titleB: string;
    descriptionB: string;
  } | null> {
    if (messages.length === 0) return null;

    const userPrompt = buildSummaryUserPrompt(messages);

    const [summaryA, summaryB] = await Promise.all([
      generateOneSummary(userPrompt, langA, learnerSettings, userId),
      generateOneSummary(userPrompt, langB, learnerSettings, userId),
    ]);

    if (summaryA === null || summaryB === null) return null;
    return {
      titleA: summaryA.title,
      descriptionA: summaryA.description,
      titleB: summaryB.title,
      descriptionB: summaryB.description,
    };
  },
};

async function generateOneSummary(
  userPrompt: string,
  lang: string,
  learnerSettings?: LearnerSettingsPromptContext,
  userId?: bigint,
): Promise<{ title: string; description: string } | null> {
  const systemPrompt = buildSummarySystemPrompt(lang, learnerSettings);
  let rawJson = "";
  const summaryTemperature =
    promptService.getTemperature("TRANSLATOR_SUMMARY") ??
    promptService.getTemperature("TRANSLATOR_SYSTEM") ??
    0.3;
  const summaryMaxTokens =
    promptService.getMaxTokens("TRANSLATOR_SUMMARY") ??
    promptService.getMaxTokens("TRANSLATOR_SYSTEM") ??
    300;

  // Try primary text adapter first (collect streaming tokens)
  const summaryModel = promptService.getModel("TRANSLATOR_SUMMARY") ?? promptService.getModel("TRANSLATOR_SYSTEM");
  const summaryAdapter = getTextAdapterForModel(summaryModel);
  if (summaryAdapter.isConfigured()) {
    try {
      let onComplete: TextUsageCompleteHandler | undefined;
      if (userId !== undefined) {
        const { llmUsageService } = await import(
          "#app/services/llm-usage-service.js"
        );
        const summaryPromptId =
          promptService.get("TRANSLATOR_SUMMARY")?.id ?? null;
        onComplete = (usage, model, finalPrompt): void => {
          llmUsageService.recordText({
            userId: userId,
            llmSystemPromptId: summaryPromptId,
            model,
            feature: "TRANSLATOR_SUMMARY",
            finalPrompt,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        };
      }
      const gen = summaryAdapter.streamText(
        {
          systemPrompt,
          userPrompt,
          temperature: summaryTemperature,
          maxOutputTokens: summaryMaxTokens,
          modelOverride: summaryModel ?? undefined,
        },
        onComplete,
      );
      for await (const chunk of gen) {
        rawJson += chunk;
      }
    } catch (error) {
      logger.warn(
        { err: error, lang },
        "LLM summary failed, falling back to OpenAI",
      );
      rawJson = "";
    }
  }

  // Fallback to OpenAI non-streaming
  if (rawJson === "") {
    const openaiKey = translatorConfig.openaiApiKey;
    if (openaiKey === "") {
      logger.warn("No API key for session summary generation");
      return null;
    }
    try {
      rawJson = await callOpenAiApiOnce(
        translatorConfig.openaiApiUrl,
        openaiKey,
        translatorConfig.openaiModel,
        systemPrompt,
        userPrompt,
        summaryTemperature,
        summaryMaxTokens,
      );
    } catch (error) {
      logger.error({ err: error, lang }, "OpenAI summary failed");
      return null;
    }
  }

  try {
    const match = /\{[\s\S]*\}/.exec(rawJson);
    const jsonStr = match !== null ? match[0] : rawJson;
    const parsed = JSON.parse(jsonStr) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj["error"] === "string" && obj["error"].length > 0) {
      logger.info(
        { error: obj["error"], lang },
        "LLM declined to summarize session",
      );
      return null;
    }
    const title =
      typeof obj["title"] === "string" ? obj["title"].slice(0, 255) : null;
    const description =
      typeof obj["description"] === "string" ? obj["description"] : null;
    if (title === null || description === null) return null;
    return { title, description };
  } catch {
    logger.warn({ rawJson, lang }, "Failed to parse session summary JSON");
    return null;
  }
}
