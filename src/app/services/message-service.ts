import {
  contactListRepository,
  messageRepository,
} from "#app/repositories/index.js";
import {
  contactListTransformer,
  messageTransformer,
} from "#app/transformers/index.js";
import { wsConnectionRegistry } from "#app/websocket/ws-connection-registry.js";
import { failure, success } from "#app/services/shared/service-result.js";
import { broadcastService } from "#app/services/broadcast-service.js";
import { pushNotificationSenderService } from "#app/services/push-notification-sender-service.js";
import { userRepository } from "#app/repositories/index.js";
import { deleteFromS3, uploadToS3 } from "#vendor/utils/storage/s3.js";
import type { UploadedFile } from "#vendor/types/types.js";
import {
  isAuthorizedEntityRequest,
  isCanonicalEntityId,
} from "#vendor/utils/helpers/entity-id.js";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ServiceResult } from "#app/services/shared/service-result.js";

function resolveMediaMimeType(file: UploadedFile): string {
  const mimeTypeFromExt = ((): string => {
    const ext = path.extname(file.filename).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    if (ext === ".heic") return "image/heic";
    if (ext === ".heif") return "image/heif";
    if (ext === ".mp3") return "audio/mpeg";
    if (ext === ".wav") return "audio/wav";
    if (ext === ".m4a") return "audio/mp4";
    if (ext === ".aac") return "audio/aac";
    if (ext === ".ogg") return "audio/ogg";
    if (ext === ".webm") return "audio/webm";
    if (ext === ".flac") return "audio/flac";
    if (ext === ".opus") return "audio/opus";
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".mov") return "video/quicktime";
    if (ext === ".avi") return "video/x-msvideo";
    if (ext === ".mkv") return "video/x-matroska";
    if (ext === ".m4v") return "video/mp4";
    return "";
  })();

  const normalized = (
    file.type !== "" ? file.type : mimeTypeFromExt
  ).toLowerCase();
  return normalized.length > 0 ? normalized : "application/octet-stream";
}

function resolveMediaTypeFromFile(
  file: UploadedFile,
): "IMAGE" | "AUDIO" | "VIDEO" | "FILE" {
  const mimeType = resolveMediaMimeType(file);
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("video/")) return "VIDEO";

  const ext = path.extname(file.filename).toLowerCase();
  if (
    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(ext)
  )
    return "IMAGE";
  if ([".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac", ".opus"].includes(ext))
    return "AUDIO";
  if ([".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"].includes(ext))
    return "VIDEO";
  return "FILE";
}

async function uploadChatImageToS3(
  userId: bigint,
  file: UploadedFile,
  directory:
    | "chat-images"
    | "chat-thumbnails"
    | "chat-audio"
    | "chat-video"
    | "chat-files",
): Promise<{ key: string; mimeType: string }> {
  const extname = path.extname(file.filename);
  const ext = extname === "" ? ".bin" : extname;
  const uniqueName = `${randomUUID()}${ext}`;

  const s3Key = `${directory}/${String(userId)}/${uniqueName}`;
  const mimeType = resolveMediaMimeType(file);

  await uploadToS3(s3Key, Buffer.from(file.data), mimeType);
  return { key: s3Key, mimeType };
}

export const messageService = {
  async getMessages(
    payloadUserId: string,
    contactId: string,
    sessionUserId: string | undefined,
  ): Promise<
    ServiceResult<{
      messages: ReturnType<typeof messageTransformer.serializeArray>;
      contact: ReturnType<typeof contactListTransformer.serializeWithDetails>;
      onlineUsers: string[];
      globalUnreadMessagesCount: number;
    }>
  > {
    if (!isAuthorizedEntityRequest(payloadUserId, sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    if (!isCanonicalEntityId(contactId)) {
      return failure("BAD_REQUEST", "Contact ID is required");
    }

    const userId = BigInt(payloadUserId);
    const contactBigInt = BigInt(contactId);

    await Promise.all([
      messageRepository.markAllAsRead(userId, contactBigInt),
      contactListRepository.resetUnreadCount(userId, contactBigInt),
    ]);

    const [messages, contacts, globalUnreadMessagesCount] = await Promise.all([
      messageRepository.findConversation(userId, contactBigInt),
      contactListRepository.findByUserIdWithDetails(userId),
      messageRepository.getUnreadCount(userId),
    ]);

    const contact = contacts.find((item) => item.contactId === contactBigInt);
    if (contact === undefined) {
      return failure("NOT_FOUND", "Messages not found");
    }

    const onlineUsers = wsConnectionRegistry.findOnlineUsers([contactId]);

    return success({
      messages: messageTransformer.serializeArray(messages),
      contact: contactListTransformer.serializeWithDetails(contact),
      onlineUsers,
      globalUnreadMessagesCount,
    });
  },

  async sendChatMessage(
    payloadUserId: string,
    contactId: string,
    content: string,
    options: {
      type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
      file?: UploadedFile;
      thumbnailFile?: UploadedFile;
    } = {},
    sessionUserId: string | undefined,
  ): Promise<
    ServiceResult<{
      message: ReturnType<typeof messageTransformer.serialize>;
    }>
  > {
    if (!isCanonicalEntityId(payloadUserId)) {
      return failure("BAD_REQUEST", "User ID is required");
    }

    if (!isCanonicalEntityId(contactId)) {
      return failure("BAD_REQUEST", "Contact ID is required");
    }

    if (!isAuthorizedEntityRequest(payloadUserId, sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    const userId = BigInt(payloadUserId);
    const contactBigInt = BigInt(contactId);
    const fileType =
      options.file !== undefined
        ? resolveMediaTypeFromFile(options.file)
        : null;
    const requestedType = options.type ?? fileType ?? "TEXT";
    const normalizedType = requestedType.trim().toUpperCase();
    let messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
    if (
      normalizedType === "TEXT" ||
      normalizedType === "IMAGE" ||
      normalizedType === "VIDEO" ||
      normalizedType === "AUDIO" ||
      normalizedType === "FILE"
    ) {
      messageType = normalizedType;
    } else {
      return failure("BAD_REQUEST", "Unsupported message type");
    }

    if (messageType === "FILE" && options.file === undefined) {
      return failure("BAD_REQUEST", "File message requires uploaded file");
    }

    let messageContent = content.trim();
    let messageSrc: string | undefined;
    let messageThumbnail: string | undefined;

    if (options.file !== undefined) {
      const file = options.file;

      const allowedImageMimeTypes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/heic",
        "image/heif",
      ]);
      const allowedAudioMimeTypes = new Set([
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/m4a",
        "audio/aac",
        "audio/ogg",
        "audio/webm",
        "audio/flac",
        "audio/opus",
      ]);
      const allowedVideoMimeTypes = new Set([
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
        "video/mp2t",
        "video/ogg",
      ]);

      const normalizedFileType = resolveMediaMimeType(file);
      const detectedType = resolveMediaTypeFromFile(file);
      messageType = detectedType;

      if (
        (detectedType === "IMAGE" &&
          !allowedImageMimeTypes.has(normalizedFileType)) ||
        (detectedType === "AUDIO" &&
          !allowedAudioMimeTypes.has(normalizedFileType)) ||
        (detectedType === "VIDEO" &&
          !allowedVideoMimeTypes.has(normalizedFileType))
      ) {
        return failure("BAD_REQUEST", "Unsupported media format");
      }

      const fileSize = file.data.byteLength;
      const maxFileSizeBytes =
        detectedType === "IMAGE"
          ? 10 * 1024 * 1024
          : detectedType === "AUDIO"
            ? 20 * 1024 * 1024
            : detectedType === "VIDEO"
              ? 80 * 1024 * 1024
              : 50 * 1024 * 1024;
      if (fileSize <= 0) {
        return failure("BAD_REQUEST", "Uploaded media file is empty");
      }
      if (fileSize > maxFileSizeBytes) {
        return failure("BAD_REQUEST", "Media file exceeds limit");
      }

      const uploadDirectory =
        detectedType === "IMAGE"
          ? "chat-images"
          : detectedType === "AUDIO"
            ? "chat-audio"
            : detectedType === "VIDEO"
              ? "chat-video"
              : "chat-files";
      const uploadedOriginal = await uploadChatImageToS3(
        userId,
        file,
        uploadDirectory,
      );
      messageSrc = uploadedOriginal.key;
      if (detectedType === "FILE" && messageContent.length === 0) {
        messageContent = file.filename;
      }

      if (detectedType === "IMAGE") {
        const thumbnailFile = options.thumbnailFile;
        if (thumbnailFile !== undefined) {
          const normalizedThumbnailType = resolveMediaMimeType(thumbnailFile);
          if (!allowedImageMimeTypes.has(normalizedThumbnailType)) {
            return failure("BAD_REQUEST", "Unsupported thumbnail format");
          }

          const thumbnailSize = thumbnailFile.data.byteLength;
          const maxThumbnailSizeBytes = 2 * 1024 * 1024;
          if (thumbnailSize <= 0) {
            return failure("BAD_REQUEST", "Uploaded thumbnail is empty");
          }
          if (thumbnailSize > maxThumbnailSizeBytes) {
            return failure("BAD_REQUEST", "Thumbnail exceeds 2MB limit");
          }

          const uploadedThumbnail = await uploadChatImageToS3(
            userId,
            thumbnailFile,
            "chat-thumbnails",
          );
          messageThumbnail = uploadedThumbnail.key;
        } else {
          messageThumbnail = messageSrc;
        }
      } else {
        messageThumbnail = undefined;
      }
    } else {
      if (messageContent.length === 0) {
        return failure("BAD_REQUEST", "Message content is required");
      }
    }

    const [senderContacts, receiverContacts] = await Promise.all([
      contactListRepository.findByUserId(userId),
      contactListRepository.findByUserId(contactBigInt),
    ]);

    const senderChat = senderContacts.find(
      (c) => c.contactId === contactBigInt,
    );
    if (senderChat === undefined) {
      return failure("NOT_FOUND", "Failed to send message");
    }

    const receiverChat = receiverContacts.find((c) => c.contactId === userId);

    const message = await messageRepository.create({
      senderId: userId,
      receiverId: contactBigInt,
      content: messageContent,
      type: messageType,
      src: messageSrc,
      thumbnail: messageThumbnail,
    });

    await Promise.all([
      messageRepository.incrementUnreadCount(contactBigInt, userId),
      contactListRepository.update(senderChat.id, {
        lastMessageId: message.id,
        lastMessageAt: new Date(),
      }),
      receiverChat !== undefined
        ? contactListRepository.update(receiverChat.id, {
            lastMessageId: message.id,
            lastMessageAt: new Date(),
          })
        : Promise.resolve(undefined),
    ]);

    broadcastService.broadcastMessageToUser(contactId, "new_message", {
      message,
    });

    // Send push notification to offline recipient
    const sender = await userRepository.findById(userId);
    const senderName = sender?.name ?? "Someone";
    const messagePreview =
      messageType === "TEXT"
        ? messageContent.slice(0, 100)
        : `Sent ${messageType.toLowerCase()}`;

    pushNotificationSenderService
      .sendToUser(
        contactBigInt,
        {
          title: senderName,
          body: messagePreview,
          url: `/`,
          tag: `chat-${String(userId)}`,
          data: { senderId: String(userId), type: "new_message" },
        },
        { skipIfOnline: true, notificationType: "new_message" },
      )
      .catch(() => {
        // Push errors should not fail the message send
      });

    return success({ message: messageTransformer.serialize(message) });
  },

  async deleteMessage(
    messageIdValue: string,
    sessionUserId: string | undefined,
  ): Promise<ServiceResult<{ message: string }>> {
    if (!isCanonicalEntityId(sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    if (!isCanonicalEntityId(messageIdValue)) {
      return failure("BAD_REQUEST", "Message ID is required");
    }

    const messageId = BigInt(messageIdValue);
    const userId = BigInt(sessionUserId);

    const message = await messageRepository.findByIdAndUserId(
      messageId,
      userId,
      "sender",
    );
    if (message === undefined) {
      return failure("NOT_FOUND", "Message not found or access denied");
    }

    const s3Keys = new Set<string>();
    if (message.src !== null && message.src.trim() !== "") {
      s3Keys.add(message.src);
    }
    if (message.thumbnail !== null && message.thumbnail.trim() !== "") {
      s3Keys.add(message.thumbnail);
    }

    for (const key of s3Keys) {
      await deleteFromS3(key);
    }

    await messageRepository.deleteById(messageId);

    return success({ message: "Message deleted successfully" });
  },

  async editMessage(
    payloadUserId: string,
    messageId: string,
    content: string,
    sessionUserId: string | undefined,
  ): Promise<
    ServiceResult<{
      message: ReturnType<typeof messageTransformer.serialize>;
    }>
  > {
    if (!isAuthorizedEntityRequest(payloadUserId, sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    if (!isCanonicalEntityId(messageId) || content.trim() === "") {
      return failure("BAD_REQUEST", "Message ID and content are required");
    }

    const updatedMessage = await messageRepository.updateContent(
      BigInt(payloadUserId),
      BigInt(messageId),
      content,
    );

    if (updatedMessage === undefined) {
      return failure("NOT_FOUND", "Message not found or access denied");
    }

    return success({ message: messageTransformer.serialize(updatedMessage) });
  },

  async markAsRead(
    messageIdValue: string,
    sessionUserId: string | undefined,
  ): Promise<
    ServiceResult<{
      message: ReturnType<typeof messageTransformer.serialize>;
    }>
  > {
    if (!isCanonicalEntityId(sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    if (!isCanonicalEntityId(messageIdValue)) {
      return failure("BAD_REQUEST", "Message ID is required");
    }

    const userId = BigInt(sessionUserId);
    const messageId = BigInt(messageIdValue);

    const message = await messageRepository.findByIdAndUserId(
      messageId,
      userId,
      "receiver",
    );
    if (message === undefined) {
      return failure("NOT_FOUND", "Message not found or access denied");
    }

    const updated = await messageRepository.markAsRead(messageId, userId);
    if (updated === undefined) {
      return failure("NOT_FOUND", "Message not found or access denied");
    }

    return success({ message: messageTransformer.serialize(updated) });
  },
};
