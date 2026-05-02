import { Mistral } from "@mistralai/mistralai";
import aiConfig from "#config/ai.js";
import { buildFinalTextPrompt } from "#app/services/ai/types.js";
import type {
  ITextAdapter,
  TextStreamOptions,
  TextUsageCompleteHandler,
} from "#app/services/ai/types.js";

const cfg = aiConfig.providers.mistralai;
const client = cfg.apiKey !== "" ? new Mistral({ apiKey: cfg.apiKey }) : null;

export const mistralaiTextAdapter: ITextAdapter = {
  isConfigured(): boolean {
    return cfg.apiKey !== "";
  },

  get model(): string {
    return cfg.textModel;
  },

  async *streamText(
    opts: TextStreamOptions,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, string, undefined> {
    if (client === null) {
      throw new Error("MistralAI is not configured");
    }

    const modelName = opts.modelOverride ?? cfg.textModel;
    const finalPrompt = buildFinalTextPrompt(opts);
    const stream = await client.chat.stream({
      model: modelName,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.3,
      maxTokens: opts.maxOutputTokens ?? 2000,
    });

    let fullText = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let hasUsage = false;

    for await (const event of stream) {
      const choice = event.data.choices[0];
      const content = choice?.delta.content;
      if (typeof content === "string" && content.length > 0) {
        fullText += content;
        yield content;
      }
      // Usage is provided in the last chunk
      const usage = event.data.usage;
      if (usage !== undefined) {
        promptTokens = usage.promptTokens ?? 0;
        completionTokens = usage.completionTokens ?? 0;
        totalTokens = usage.totalTokens ?? 0;
        hasUsage = true;
      }
    }

    if (onComplete !== undefined && hasUsage) {
      try {
        onComplete({ promptTokens, completionTokens, totalTokens }, modelName, finalPrompt);
      } catch {
        // ignore usage tracking errors
      }
    }

    return fullText;
  },
};
