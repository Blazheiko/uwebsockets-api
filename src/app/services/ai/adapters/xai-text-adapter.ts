import { streamText, tool, jsonSchema, stepCountIs } from "ai";
import { createXai } from "@ai-sdk/xai";
import aiConfig from "#config/ai.js";
import { buildFinalTextPrompt } from "#app/services/ai/types.js";
import type {
  ITextAdapter,
  TextStreamOptions,
  TextUsageCompleteHandler,
} from "#app/services/ai/types.js";
import logger from "#logger";

const cfg = aiConfig.providers.xai;
const xaiProvider = createXai(cfg.apiKey === "" ? {} : { apiKey: cfg.apiKey });

export const xaiTextAdapter: ITextAdapter = {
  isConfigured(): boolean {
    return cfg.apiKey !== "";
  },

  get model(): string {
    return cfg.chatModel;
  },

  async *streamText(
    opts: TextStreamOptions,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, string, undefined> {
    const modelName = opts.modelOverride ?? cfg.chatModel;
    const finalPrompt = buildFinalTextPrompt(opts);

    const hasTools = opts.toolCallHandler !== undefined && Object.keys(opts.toolCallHandler.tools).length > 0;

    // Build tools with execute() delegates when toolCallHandler is provided
    type CoreTool = ReturnType<typeof tool>;
    const wrappedTools: Record<string, CoreTool> | undefined = hasTools
      ? Object.fromEntries(
          Object.entries(opts.toolCallHandler!.tools).map(([name, def]) => [
            name,
            tool({
              description: def.description,
              parameters: jsonSchema(def.parametersSchema),
              execute: async (args: unknown): Promise<string> =>
                opts.toolCallHandler!.onCall(name, args),
            }),
          ]),
        )
      : undefined;

    const streamParams = {
      model: xaiProvider.chat(modelName),
      system: opts.systemPrompt,
      prompt: opts.userPrompt,
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxOutputTokens ?? 2000,
      // step 1 = LLM text + tool call, step 2 = tool execution, step 3 = LLM continuation
      stopWhen: hasTools ? stepCountIs(3) : stepCountIs(1),
      ...(wrappedTools !== undefined ? { tools: wrappedTools } : {}),
    };
    const result = streamText(streamParams);

    if (hasTools) {
      logger.info({ tools: Object.keys(wrappedTools!) }, "XAI adapter: streaming with tools");
    }

    let fullText = "";
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        fullText += part.text;
        yield part.text;
      } else {
        // Log every non-text part type for diagnostics
        logger.info({ partType: part.type }, "XAI adapter: stream part");
      }
    }

    logger.info({ fullTextLength: fullText.length, hasTools }, "XAI adapter: stream complete");

    if (onComplete !== undefined) {
      try {
        const usage = await result.usage;
        const promptTokens = usage.inputTokens ?? 0;
        const completionTokens = usage.outputTokens ?? 0;
        onComplete(
          {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
          modelName,
          finalPrompt,
        );
      } catch {
        // ignore usage tracking errors
      }
    }

    return fullText;
  },
};
