import type { HttpContext } from "#vendor/types/types.js";
import { translatorService } from "#app/services/translator-service.js";
import { translatorRealtimeService } from "#app/services/translator-realtime-service.js";
import type {
  TranslatorGetSessionsResponse,
  TranslatorGetMessagesResponse,
  TranslatorGetRealtimeMessagesResponse,
  TranslatorDeleteSessionsResponse,
  TranslatorDeleteSessionResponse,
} from "shared";

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

function resolveUserId(context: HttpContext): bigint | null {
  if (!context.auth.check()) {
    context.responseData.status = 401;
    return null;
  }

  const userId = context.auth.getUserId();
  if (userId === null) {
    context.responseData.status = 401;
    return null;
  }

  return BigInt(userId);
}

export default {
  async getSessions(
    context: HttpContext,
  ): Promise<TranslatorGetSessionsResponse> {
    context.logger.info("translator getSessions handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const result = await translatorService.getSessions(userId);

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async getSessionMessages(
    context: HttpContext,
  ): Promise<TranslatorGetMessagesResponse> {
    context.logger.info("translator getSessionMessages handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { sessionId } = context.httpData.params as { sessionId: string };
    const result = await translatorService.getSessionMessages(
      userId,
      sessionId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async getRealtimeSessionMessages(
    context: HttpContext,
  ): Promise<TranslatorGetRealtimeMessagesResponse> {
    context.logger.info("translator getRealtimeSessionMessages handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { sessionId } = context.httpData.params as { sessionId: string };
    const result = await translatorRealtimeService.getSessionMessages(
      userId,
      sessionId,
    );

    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success", data: result.data.data };
  },

  async deleteAllSessions(
    context: HttpContext,
  ): Promise<TranslatorDeleteSessionsResponse> {
    context.logger.info("translator deleteAllSessions handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const result = await translatorService.deleteAllSessions(userId);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success" };
  },

  async deleteSession(
    context: HttpContext,
  ): Promise<TranslatorDeleteSessionResponse> {
    context.logger.info("translator deleteSession handler");

    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }

    const { sessionId } = context.httpData.params as { sessionId: string };
    const result = await translatorService.deleteSession(userId, sessionId);
    if (!result.ok) {
      setServiceErrorStatus(context, result.code);
      return { status: "error", message: result.message };
    }

    return { status: "success" };
  },
};
