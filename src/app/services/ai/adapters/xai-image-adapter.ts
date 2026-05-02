import { generateImage } from "ai";
import { createXai } from "@ai-sdk/xai";
import aiConfig from "#config/ai.js";
import type {
  IImageAdapter,
  ImageGenerateResult,
} from "#app/services/ai/types.js";

const cfg = aiConfig.providers.xai;
const xaiProvider = createXai(cfg.apiKey === "" ? {} : { apiKey: cfg.apiKey });

export const xaiImageAdapter: IImageAdapter = {
  isConfigured(): boolean {
    return cfg.apiKey !== "";
  },

  get model(): string {
    return cfg.imageModel;
  },

  async generateImage(prompt: string): Promise<ImageGenerateResult> {
    const response = await generateImage({
      model: xaiProvider.image(cfg.imageModel),
      prompt,
    });

    return {
      imageBase64: response.image.base64,
      mimeType: response.image.mediaType,
    };
  },

  async editImage(
    prompt: string,
    imageDataUrl: string,
  ): Promise<ImageGenerateResult> {
    const response = await generateImage({
      model: xaiProvider.image(cfg.imageModel),
      prompt: {
        text: prompt,
        images: [imageDataUrl],
      },
    });

    return {
      imageBase64: response.image.base64,
      mimeType: response.image.mediaType,
    };
  },
};
