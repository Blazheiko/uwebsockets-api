import type {
  ReadMessagesInput,
  RegisterInput,
  WSCallerIdPayload,
  WSEventTypingPayload,
  WSTargetUserIdPayload,
} from "shared/schemas";
import { broadcastService } from "#app/services/broadcast-service.js";
import {
  contactListRepository,
  messageRepository,
  userRepository,
} from "#app/repositories/index.js";
import { userTransformer } from "#app/transformers/index.js";

interface WsStatusResponse {
  status: "ok";
  message: string;
  globalUnreadMessagesCount?: number;
}

export const wsService = {
  eventTyping(payload: WSEventTypingPayload): { status: "ok" } {
    broadcastService.broadcastMessageToUser(
      payload.contactId,
      "event_typing",
      payload,
    );
    return { status: "ok" };
  },

  async readMessage(payload: ReadMessagesInput): Promise<WsStatusResponse> {
    const userId = BigInt(payload.userId);
    const contactId = BigInt(payload.contactId);

    await Promise.all([
      messageRepository.markAllAsRead(userId, contactId),
      contactListRepository.resetUnreadCount(userId, contactId),
    ]);

    const unreadAfter = await messageRepository.getUnreadCount(userId);

    return {
      status: "ok",
      message: "Read message event sent",
      globalUnreadMessagesCount: unreadAfter,
    };
  },

  incomingCall(payload: WSEventTypingPayload): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.contactId,
      "incoming_call",
      payload,
    );
    return { status: "ok", message: "Incoming call event sent" };
  },

  acceptIncomingCall(
    payload: WSCallerIdPayload,
    senderUserId?: string,
    senderUuid?: string,
  ): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.callerId,
      "accept_call",
      payload,
    );
    if (senderUserId !== undefined && senderUuid !== undefined) {
      broadcastService.broadcastMessageToUserExcept(
        senderUserId,
        senderUuid,
        "call_handled_on_other_device",
        { action: "accepted" },
      );
    }
    return { status: "ok", message: "Accept call event sent" };
  },

  declineIncomingCall(
    payload: WSCallerIdPayload,
    senderUserId?: string,
    senderUuid?: string,
  ): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.callerId,
      "decline_call",
      payload,
    );
    if (senderUserId !== undefined && senderUuid !== undefined) {
      broadcastService.broadcastMessageToUserExcept(
        senderUserId,
        senderUuid,
        "call_handled_on_other_device",
        { action: "declined" },
      );
    }
    return { status: "ok", message: "Decline call event sent" };
  },

  webrtcCallOffer(
    payload: WSTargetUserIdPayload,
    senderUserId?: string,
    senderUuid?: string,
  ): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_call_offer",
      payload,
    );
    if (senderUserId !== undefined && senderUuid !== undefined) {
      broadcastService.broadcastMessageToUserExcept(
        senderUserId,
        senderUuid,
        "call_handled_on_other_device",
        { action: "outgoing_call_started" },
      );
    }
    return { status: "ok", message: "Webrtc call offer event sent" };
  },

  webrtcCallAnswer(payload: WSTargetUserIdPayload): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_call_answer",
      payload,
    );
    return { status: "ok", message: "Webrtc call answer event sent" };
  },

  webrtcIceCandidate(payload: WSTargetUserIdPayload): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_ice_candidate",
      payload,
    );
    return { status: "ok", message: "Webrtc ice candidate event sent" };
  },

  webrtcStartCall(payload: WSTargetUserIdPayload): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_start_call",
      payload,
    );
    return { status: "ok", message: "Webrtc start call event sent" };
  },

  webrtcCallEnd(
    payload: WSTargetUserIdPayload,
    senderUserId?: string,
    senderUuid?: string,
  ): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_call_end",
      payload,
    );
    if (senderUserId !== undefined && senderUuid !== undefined) {
      broadcastService.broadcastMessageToUserExcept(
        senderUserId,
        senderUuid,
        "call_handled_on_other_device",
        { action: "ended" },
      );
    }
    return { status: "ok", message: "Webrtc call end event sent" };
  },

  webrtcCancelCall(payload: WSTargetUserIdPayload): WsStatusResponse {
    broadcastService.broadcastMessageToUser(
      payload.targetUserId,
      "webrtc_cancel_call",
      payload,
    );
    return { status: "ok", message: "Webrtc cancel call event sent" };
  },

  testWs(): WsStatusResponse {
    return { status: "ok", message: "testWs" };
  },

  async saveUser(
    payload: RegisterInput,
  ): Promise<{
    status: "ok";
    user: ReturnType<typeof userTransformer.serialize>;
  }> {
    const user = await userRepository.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
    });

    return {
      status: "ok",
      user: userTransformer.serialize(user),
    };
  },
};
