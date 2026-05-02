import aiConfig from "#config/ai.js";
import type { UploadedFile } from "#vendor/types/types.js";
import { imageAdapter } from "#app/services/ai/ai-provider.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface EditedImagePayload {
  imageBase64: string;
  mimeType: string;
}

export const chatImageAiService = {
  async editImage(
    imageFile: UploadedFile | undefined,
    prompt: string,
    userId?: bigint,
  ): Promise<ServiceResult<EditedImagePayload>> {
    if (imageFile === undefined) {
      return failure("BAD_REQUEST", "Image file is required");
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt === "") {
      return failure("BAD_REQUEST", "Prompt is required");
    }
    if (trimmedPrompt.length > aiConfig.maxPromptLength) {
      return failure(
        "BAD_REQUEST",
        `Prompt is too long. Max length is ${String(aiConfig.maxPromptLength)} symbols`,
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return failure(
        "BAD_REQUEST",
        "Invalid image type. Allowed: jpeg, png, webp",
      );
    }
    if (imageFile.data.byteLength <= 0 || imageFile.data.byteLength > MAX_FILE_SIZE) {
      return failure("BAD_REQUEST", "Image size must be between 1 byte and 10 MB");
    }

    if (!imageAdapter.isConfigured()) {
      return failure("INTERNAL", "Image AI provider is not configured");
    }

    const finalPrompt = [
      trimmedPrompt,
      aiConfig.chatImageEditStylePrompt,
    ].join("\n");

    const imageBase64 = Buffer.from(imageFile.data).toString("base64");
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    try {
      const edited = await imageAdapter.editImage(finalPrompt, imageDataUrl);
      if (userId !== undefined) {
        llmUsageService.recordImage({
          userId,
          llmSystemPromptId: null,
          model: imageAdapter.model,
          feature: "CHAT_IMAGE_EDIT",
        });
      }
      return success(edited);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure("INTERNAL", `Failed to edit image: ${message}`);
    }
  },
};
