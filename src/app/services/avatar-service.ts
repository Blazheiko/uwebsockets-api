import { randomUUID } from "node:crypto";
import path from "node:path";
import type { UploadedFile } from "#vendor/types/types.js";
import { userRepository } from "#app/repositories/index.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import { uploadToS3, deleteFromS3 } from "#vendor/utils/storage/s3.js";
import diskConfig from "#config/disk.js";
import aiConfig from "#config/ai.js";
import { imageAdapter } from "#app/services/ai/ai-provider.js";
import { llmUsageService } from "#app/services/llm-usage-service.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface AvatarUserPayload {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface GeneratedAvatarPayload {
  imageBase64: string;
  mimeType: string;
}

function buildFullS3Key(key: string): string {
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}


export const avatarService = {
  async uploadAvatar(
    userId: bigint,
    file: UploadedFile | undefined,
  ): Promise<ServiceResult<{ user: AvatarUserPayload }>> {
    if (file === undefined) {
      return failure("BAD_REQUEST", "No file uploaded");
    }

    if (file.data.byteLength > MAX_FILE_SIZE) {
      return failure("BAD_REQUEST", "File size exceeds 10 MB limit");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return failure(
        "BAD_REQUEST",
        "Invalid file type. Allowed: jpeg, png, webp",
      );
    }

    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    // Generate S3 key
    const extname = path.extname(file.filename);
    const ext = extname === "" ? ".webp" : extname;
    const uniqueName = `${randomUUID()}${ext}`;
    const s3Key = `avatars/${String(userId)}/${uniqueName}`;

    // Upload to S3
    await uploadToS3(s3Key, Buffer.from(file.data), file.type);

    // Delete old avatar if exists
    if (user.avatar !== null && user.avatar !== undefined) {
      try {
        await deleteFromS3(buildFullS3Key(user.avatar));
      } catch {
        // Ignore deletion errors for old avatar
      }
    }

    // Update user record
    const updated = await userRepository.update(userId, { avatar: s3Key });
    if (updated === undefined) {
      return failure("INTERNAL", "Failed to update user");
    }

    return success({
      user: {
        id: String(updated.id),
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar ?? null,
      },
    });
  },

  async deleteAvatar(
    userId: bigint,
  ): Promise<ServiceResult<{ user: AvatarUserPayload }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    if (user.avatar !== null && user.avatar !== undefined) {
      try {
        await deleteFromS3(buildFullS3Key(user.avatar));
      } catch {
        // Ignore deletion errors
      }
    }

    const updated = await userRepository.update(userId, { avatar: null });
    if (updated === undefined) {
      return failure("INTERNAL", "Failed to update user");
    }

    return success({
      user: {
        id: String(updated.id),
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar ?? null,
      },
    });
  },

  async generateAvatarWithAi(
    prompt: string,
    userId?: bigint,
  ): Promise<ServiceResult<GeneratedAvatarPayload>> {
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

    if (!imageAdapter.isConfigured()) {
      return failure("INTERNAL", "Image AI provider is not configured");
    }

    const finalPrompt = [trimmedPrompt, aiConfig.avatarStylePrompt].join("\n");
    try {
      const generated = await imageAdapter.generateImage(finalPrompt);
      if (userId !== undefined) {
        llmUsageService.recordImage({
          userId,
          llmSystemPromptId: null,
          model: imageAdapter.model,
          feature: "AVATAR_GENERATE",
        });
      }
      return success(generated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure("INTERNAL", `Failed to generate avatar: ${message}`);
    }
  },
};
