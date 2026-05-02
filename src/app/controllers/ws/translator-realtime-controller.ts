import logger from "#logger";
import type { WsContext, UserConnection } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { translatorRealtimeService } from "#app/services/translator-realtime-service.js";
import type {
  TranslatorRealtimeStartInput,
  TranslatorRealtimeSaveInput,
  TranslatorRealtimeEndInput,
} from "shared/schemas";
import type {
  TranslatorRealtimeStartResponse,
  TranslatorRealtimeSaveResponse,
  TranslatorRealtimeEndResponse,
} from "shared";

export default {
  async start(
    context: WsContext<TranslatorRealtimeStartInput>,
  ): Promise<TranslatorRealtimeStartResponse> {
    logger.info("ws translator realtime start");
    const userData = context.wsData.middlewareData["userData"] as
      | UserConnection
      | undefined;
    if (userData?.userId === undefined) {
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await translatorRealtimeService.startSession(
      BigInt(userData.userId),
      payload.langOwner,
      payload.langOpponent,
    );

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    return {
      status: "ok",
      sessionId: result.data.sessionId,
      clientSecret: result.data.clientSecret,
      expiresAt: result.data.expiresAt,
      model: result.data.model,
      voice: result.data.voice,
      promptTemplate: result.data.promptTemplate,
    };
  },

  async save(
    context: WsContext<TranslatorRealtimeSaveInput>,
  ): Promise<TranslatorRealtimeSaveResponse> {
    logger.info("ws translator realtime save");
    const userData = context.wsData.middlewareData["userData"] as
      | UserConnection
      | undefined;
    if (userData?.userId === undefined) {
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await translatorRealtimeService.saveMessages(
      BigInt(userData.userId),
      payload.sessionId,
      payload.messages,
    );

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    return { status: "ok", saved: result.data.saved };
  },

  async end(
    context: WsContext<TranslatorRealtimeEndInput>,
  ): Promise<TranslatorRealtimeEndResponse> {
    logger.info("ws translator realtime end");
    const userData = context.wsData.middlewareData["userData"] as
      | UserConnection
      | undefined;
    if (userData?.userId === undefined) {
      return { status: "error", message: "Unauthorized" };
    }

    const payload = getTypedPayload(context);
    const result = await translatorRealtimeService.endSession(
      BigInt(userData.userId),
      payload.sessionId,
    );

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    return { status: "ok", message: result.data.message };
  },
};
