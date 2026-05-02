import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { chatListService } from "#app/services/chat-list-service.js";
import type {
  GetContactListResponse,
  CreateChatResponse,
  DeleteChatResponse,
} from "shared";
import type {
  CreateChatInput,
  DeleteChatInput,
  GetContactListInput,
} from "shared/schemas";

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

export default {
  async getContactList(
    context: HttpContext<GetContactListInput>,
  ): Promise<GetContactListResponse> {
    context.logger.info("getChatList");

    const sessionInfo = context.session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { userId } = getTypedPayload(context);
    const myUserId = sessionInfo.data.userId;
    const result = await chatListService.getContactList(userId, myUserId);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return {
        status: result.code === "UNAUTHORIZED" ? "unauthorized" : "error",
        message: result.message,
      };
    }

    return {
      status: "ok",
      contactList: result.data.contactList,
      onlineUsers: result.data.onlineUsers,
    };
  },

  async createChat(
    context: HttpContext<CreateChatInput>,
  ): Promise<CreateChatResponse> {
    context.logger.info("createChat");

    const sessionInfo = context.session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { participantId } = getTypedPayload(context);
    const result = await chatListService.createChat(
      sessionInfo.data.userId,
      participantId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return {
        status: result.code === "UNAUTHORIZED" ? "unauthorized" : "error",
        message: result.message,
      };
    }

    return { status: "ok", chat: result.data.chat };
  },

  async deleteChat(
    context: HttpContext<DeleteChatInput>,
  ): Promise<DeleteChatResponse> {
    context.logger.info("deleteChat");

    const sessionInfo = context.session.sessionInfo;
    if (sessionInfo === null) {
      return { status: "error", message: "Session not found" };
    }

    const { chatId } = getTypedPayload(context);
    const result = await chatListService.deleteChat(
      sessionInfo.data.userId,
      chatId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return {
        status: result.code === "UNAUTHORIZED" ? "unauthorized" : "error",
        message: result.message,
      };
    }

    return { status: "ok", message: result.data.message };
  },
};
