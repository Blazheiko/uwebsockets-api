import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { messageService } from "#app/services/message-service.js";
import { chatImageAiService } from "#app/services/chat-image-ai-service.js";
import type { UploadedFile } from "#vendor/types/types.js";
import type {
  GetMessagesResponse,
  SendMessageResponse,
  DeleteMessageResponse,
  EditMessageResponse,
  MarkAsReadResponse,
  EditChatImageWithAiResponse,
} from "shared";
import type {
  EditMessageInput,
  GetMessagesInput,
  MarkMessageAsReadInput,
  SendMessageInput,
  EditImageWithAiInput,
} from "shared/schemas";
import {
  isCanonicalEntityId,
  toCanonicalEntityId,
} from "#vendor/utils/helpers/entity-id.js";

function setServiceErrorStatus(
  context: HttpContext,
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL",
): void {
  if (code === "BAD_REQUEST") {
    context.responseData.status = 400;
    return;
  }
  if (code === "UNAUTHORIZED") {
    context.responseData.status = 401;
    return;
  }
  if (code === "NOT_FOUND") {
    context.responseData.status = 404;
    return;
  }
  if (code === "CONFLICT") {
    context.responseData.status = 409;
    return;
  }
  context.responseData.status = 500;
}

function mapStatus(
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL",
): "ok" | "error" | "unauthorized" {
  return code === "UNAUTHORIZED" ? "unauthorized" : "error";
}

function parseMessageType(
  value: unknown,
): "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "TEXT" ||
    normalized === "IMAGE" ||
    normalized === "VIDEO" ||
    normalized === "AUDIO" ||
    normalized === "FILE"
  ) {
    return normalized;
  }
  return undefined;
}

export default {
  async getMessages(
    context: HttpContext<GetMessagesInput>,
  ): Promise<GetMessagesResponse> {
    context.logger.info("getMessages");

    const sessionInfo = context.session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { contactId, userId } = getTypedPayload(context);
    const result = await messageService.getMessages(
      userId,
      contactId,
      sessionInfo.data.userId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return {
      status: "ok",
      messages: result.data.messages,
      contact: result.data.contact,
      onlineUsers: result.data.onlineUsers,
    };
  },

  async sendChatMessage(
    context: HttpContext<SendMessageInput>,
  ): Promise<SendMessageResponse> {
    const { logger, responseData, session } = context;
    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      logger.warn("sendChatMessage: session not found");
      return { status: "error", message: "Session not found" };
    }

    const payload = getTypedPayload(context);
    const sendOptions: {
      type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
    } = {};
    if (payload.type !== undefined) sendOptions.type = payload.type;

    let result: Awaited<ReturnType<typeof messageService.sendChatMessage>>;
    try {
      result = await messageService.sendChatMessage(
        payload.userId,
        payload.contactId,
        payload.content,
        sendOptions,
        sessionInfo.data.userId,
      );
    } catch (error) {
      logger.error({ err: error }, "sendChatMessage: service threw exception");
      responseData.status = 500;
      return { status: "error", message: "Internal server error while sending message" };
    }

    if (!result.ok) {
      logger.warn({ code: result.code, message: result.message }, "sendChatMessage: service returned failure");
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },

  async sendChatMessageMedia(
    context: HttpContext,
  ): Promise<SendMessageResponse> {
    const { logger, httpData, responseData, session } = context;
    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      logger.warn("sendChatMessageMedia: session not found");
      return { status: "error", message: "Session not found" };
    }

    const payload = (httpData.payload ?? {}) as Record<string, unknown>;
    const sessionUserId = isCanonicalEntityId(sessionInfo.data.userId)
      ? sessionInfo.data.userId
      : null;
    const payloadUserId = toCanonicalEntityId(payload["userId"]);
    const payloadContactId = toCanonicalEntityId(payload["contactId"]);

    if (payloadContactId === null) {
      responseData.status = 400;
      return { status: "error", message: "Contact ID is required" };
    }

    if (payloadUserId === null && sessionUserId === null) {
      responseData.status = 401;
      return { status: "unauthorized", message: "Session expired" };
    }

    const userId = payloadUserId ?? sessionUserId ?? "";
    const contactId = payloadContactId;
    const content = String(payload["content"] ?? "");
    const type = parseMessageType(payload["type"]);
    const file =
      httpData.files?.get("media") ??
      httpData.files?.get("image") ??
      httpData.files?.get("audio") ??
      httpData.files?.get("video") ??
      httpData.files?.values().next().value;
    const thumbnailFile = httpData.files?.get("thumbnail");

    const sendOptions: {
      type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
      file?: UploadedFile;
      thumbnailFile?: UploadedFile;
    } = {};
    if (type !== undefined) sendOptions.type = type;
    if (file !== undefined) sendOptions.file = file;
    if (thumbnailFile !== undefined) sendOptions.thumbnailFile = thumbnailFile;

    let result: Awaited<ReturnType<typeof messageService.sendChatMessage>>;
    try {
      result = await messageService.sendChatMessage(
        userId,
        contactId,
        content,
        sendOptions,
        sessionInfo.data.userId,
      );
    } catch (error) {
      logger.error({ err: error }, "sendChatMessageMedia: service threw exception");
      responseData.status = 500;
      return { status: "error", message: "Internal server error while sending message" };
    }

    if (!result.ok) {
      logger.warn({ code: result.code, message: result.message }, "sendChatMessageMedia: service returned failure");
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },

  async deleteMessage(context: HttpContext): Promise<DeleteMessageResponse> {
    const { logger, httpData, session } = context;
    logger.info("deleteMessage");

    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { messageId } = httpData.params;
    if (messageId === undefined) {
      return { status: "error", message: "Message ID is required" };
    }

    const result = await messageService.deleteMessage(
      messageId,
      sessionInfo.data.userId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },

  async editMessage(
    context: HttpContext<EditMessageInput>,
  ): Promise<EditMessageResponse> {
    const { logger, session } = context;
    logger.info("editMessage");

    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { messageId, content, userId } = getTypedPayload(context);
    const result = await messageService.editMessage(
      userId,
      messageId,
      content,
      sessionInfo.data.userId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },

  async markAsRead(
    context: HttpContext<MarkMessageAsReadInput>,
  ): Promise<MarkAsReadResponse> {
    const { logger, session } = context;
    logger.info("markAsRead");

    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { messageId } = getTypedPayload(context);
    const result = await messageService.markAsRead(
      messageId,
      sessionInfo.data.userId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },

  async editImageWithAi(context: HttpContext<EditImageWithAiInput>): Promise<EditChatImageWithAiResponse> {
    const { logger, session, httpData } = context;
    logger.info("editImageWithAi");

    const sessionInfo = session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const payload = getTypedPayload(context);
    const prompt = payload.prompt ?? "";
    const imageFile =
      httpData.files?.get("image") ?? httpData.files?.get("media");

    const userId = sessionInfo.data.userId !== undefined ? BigInt(sessionInfo.data.userId) : undefined;
    const result = await chatImageAiService.editImage(imageFile, prompt, userId);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: mapStatus(result.code), message: result.message };
    }

    return {
      status: "ok",
      imageBase64: result.data.imageBase64,
      mimeType: result.data.mimeType,
    };
  },
};
