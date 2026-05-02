import WSApiController from "#app/controllers/ws/ws-api-controller.js";
import AdminWsController from "#app/controllers/ws/admin-ws-controller.js";
import TranslatorController from "#app/controllers/ws/translator-controller.js";
import TranslatorRealtimeController from "#app/controllers/ws/translator-realtime-controller.js";
import TeacherController from "#app/controllers/ws/teacher-controller.js";
import SupportWsController from "#app/controllers/ws/support-controller.js";
import { defineWsRoute } from "#vendor/utils/routing/define-ws-route.js";
import {
  ReadMessagesInputSchema,
  RegisterInputSchema,
  WSCallerIdPayloadSchema,
  WSEventTypingPayloadSchema,
  WSTargetUserIdPayloadSchema,
  WSVideoCallLogEndPayloadSchema,
  WSVideoCallLogStartPayloadSchema,
  TranslatorStartInputSchema,
  TranslatorTranslateInputSchema,
  TranslatorEndInputSchema,
  TranslatorRealtimeStartInputSchema,
  TranslatorRealtimeSaveInputSchema,
  TranslatorRealtimeEndInputSchema,
  TeacherChatInputSchema,
  TeacherGenerateVocabularyInputSchema,
  TeacherGenerateVocabularyFromSessionInputSchema,
  TeacherGetLessonInputSchema,
  TeacherOpenChatInputSchema,
  TeacherConfirmVocabularyInputSchema,
  TeacherGenerateSyntaxLessonInputSchema,
  SupportChatInputSchema,
  SupportOpenChatInputSchema,
} from "shared/schemas";
import * as ResponseSchemas from "shared/responses";

export default [
  {
    group: [
      defineWsRoute({
        url: "subscribe_online_users",
        handler: AdminWsController.subscribeOnlineUsers.bind(AdminWsController),
        description: "Subscribe current admin websocket to admin online updates",
      }),
      defineWsRoute({
        url: "unsubscribe_online_users",
        handler: AdminWsController.unsubscribeOnlineUsers.bind(AdminWsController),
        description: "Unsubscribe current admin websocket from admin online updates",
      }),
    ],
    prefix: "admin",
    description: "Admin websocket routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 120,
    },
  },
  {
    group: [
      defineWsRoute({
        url: "event_typing",
        handler: WSApiController.eventTyping.bind(WSApiController),
        validator: WSEventTypingPayloadSchema,
        ResponseSchema: ResponseSchemas.EventTypingResponseSchema,
        description: "Handle typing events",
        rateLimit: {
          windowMs: 1 * 60 * 1000, // 1 minute
          maxRequests: 30, // Max 30 typing events per minute
        },
      }),
      defineWsRoute({
        url: "read_message",
        handler: WSApiController.readMessage.bind(WSApiController),
        ResponseSchema: ResponseSchemas.ReadMessageResponseSchema,
        validator: ReadMessagesInputSchema,
        description: "Handle read message events",
      }),
      defineWsRoute({
        url: "incoming_call",
        handler: WSApiController.incomingCall.bind(WSApiController),
        validator: WSEventTypingPayloadSchema,
        ResponseSchema: ResponseSchemas.IncomingCallResponseSchema,
        description: "Handle incoming call events",
      }),
      defineWsRoute({
        url: "accept_call",
        handler: WSApiController.acceptIncomingCall.bind(WSApiController),
        validator: WSCallerIdPayloadSchema,
        ResponseSchema: ResponseSchemas.AcceptCallResponseSchema,
        description: "Handle accept call events",
      }),
      defineWsRoute({
        url: "decline_call",
        handler: WSApiController.declineIncomingCall.bind(WSApiController),
        validator: WSCallerIdPayloadSchema,
        ResponseSchema: ResponseSchemas.DeclineCallResponseSchema,
        description: "Handle decline call events",
      }),
      defineWsRoute({
        url: "webrtc_call_offer",
        handler: WSApiController.webrtcCallOffer.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallOfferResponseSchema,
        description: "Handle webrtc call offer events",
      }),
      defineWsRoute({
        url: "webrtc_call_answer",
        handler: WSApiController.webrtcCallAnswer.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallAnswerResponseSchema,
        description: "Handle webrtc call answer events",
      }),
      defineWsRoute({
        url: "webrtc_ice_candidate",
        handler: WSApiController.webrtcIceCandidate.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcIceCandidateResponseSchema,
        description: "Handle webrtc ice candidate events",
      }),
      defineWsRoute({
        url: "start_call",
        handler: WSApiController.webrtcStartCall.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcStartCallResponseSchema,
        description: "Handle webrtc start call events",
      }),
      defineWsRoute({
        url: "cancel_call",
        handler: WSApiController.webrtcCancelCall.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCancelCallResponseSchema,
        description: "Handle webrtc cancel call events",
      }),
      defineWsRoute({
        url: "end_call",
        handler: WSApiController.webrtcCallEnd.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallEndResponseSchema,
        description: "Handle webrtc call end events",
      }),
      defineWsRoute({
        url: "webrtc_call_end",
        handler: WSApiController.webrtcCallEnd.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallEndResponseSchema,
        description: "Handle webrtc call end events",
      }),
      defineWsRoute({
        url: "webrtc_call_end_received",
        handler: WSApiController.webrtcCallEnd.bind(WSApiController),
        validator: WSTargetUserIdPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallEndResponseSchema,
        description: "Handle webrtc call end events",
      }),
      defineWsRoute({
        url: "webrtc_call_log_start",
        handler: WSApiController.webrtcCallLogStart.bind(WSApiController),
        validator: WSVideoCallLogStartPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallLogStartResponseSchema,
        description: "Persist a connected video call and create linked chat message",
      }),
      defineWsRoute({
        url: "webrtc_call_log_end",
        handler: WSApiController.webrtcCallLogEnd.bind(WSApiController),
        validator: WSVideoCallLogEndPayloadSchema,
        ResponseSchema: ResponseSchemas.WebrtcCallLogEndResponseSchema,
        description: "Finish persisted video call and update linked chat message",
      }),
      defineWsRoute({
        url: "error",
        handler: WSApiController.error.bind(WSApiController),
        ResponseSchema: ResponseSchemas.WSErrorResponseSchema,
        middlewares: ["test2"],
        description: "Error handling test",
      }),
      defineWsRoute({
        url: "test-ws",
        handler: WSApiController.testWs.bind(WSApiController),
        ResponseSchema: ResponseSchemas.TestWsResponseSchema,
        description: "Test WebSocket",
      }),
      defineWsRoute({
        url: "save-user",
        handler: WSApiController.saveUser.bind(WSApiController),
        ResponseSchema: ResponseSchemas.WSSaveUserResponseSchema,
        validator: RegisterInputSchema,
        description: "Save user data",
        rateLimit: {
          windowMs: 5 * 60 * 1000, // 5 minutes
          maxRequests: 5, // Max 5 user save operations per 5 minutes
        },
      }),
    ],
    prefix: "main",
    description: "Main routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000, // 15 minutes
      maxRequests: 600, // Max 100 requests per 15 minutes for the whole group
    },
  },
  {
    group: [
      defineWsRoute({
        url: "translator_realtime_start",
        handler: TranslatorRealtimeController.start.bind(
          TranslatorRealtimeController,
        ),
        validator: TranslatorRealtimeStartInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorRealtimeStartResponseSchema,
        description: "Start realtime translator session",
      }),
      defineWsRoute({
        url: "translator_realtime_save",
        handler: TranslatorRealtimeController.save.bind(
          TranslatorRealtimeController,
        ),
        validator: TranslatorRealtimeSaveInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorRealtimeSaveResponseSchema,
        description: "Save realtime translator messages",
      }),
      defineWsRoute({
        url: "translator_realtime_end",
        handler: TranslatorRealtimeController.end.bind(
          TranslatorRealtimeController,
        ),
        validator: TranslatorRealtimeEndInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorRealtimeEndResponseSchema,
        description: "End realtime translator session",
      }),
    ],
    prefix: "translator_realtime",
    description: "Realtime translator routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 180,
    },
  },
  {
    group: [
      defineWsRoute({
        url: "translator_start",
        handler: TranslatorController.start.bind(TranslatorController),
        validator: TranslatorStartInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorStartResponseSchema,
        description: "Start translator session",
      }),
      defineWsRoute({
        url: "translator_translate",
        handler: TranslatorController.translate.bind(TranslatorController),
        validator: TranslatorTranslateInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorTranslateResponseSchema,
        description: "Translate text in session",
      }),
      defineWsRoute({
        url: "translator_end",
        handler: TranslatorController.end.bind(TranslatorController),
        validator: TranslatorEndInputSchema,
        ResponseSchema: ResponseSchemas.TranslatorEndResponseSchema,
        description: "End translator session",
      }),
    ],
    prefix: "translator",
    description: "Translator routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 120,
    },
  },
  {
    group: [
      defineWsRoute({
        url: "teacher_open_chat",
        handler: TeacherController.openChat.bind(TeacherController),
        validator: TeacherOpenChatInputSchema,
        ResponseSchema: ResponseSchemas.TeacherOpenChatResponseSchema,
        description: "Trigger teacher first greeting",
      }),
      defineWsRoute({
        url: "teacher_chat",
        handler: TeacherController.chat.bind(TeacherController),
        validator: TeacherChatInputSchema,
        ResponseSchema: ResponseSchemas.TeacherChatResponseSchema,
        description: "Chat with Маэстро teacher",
      }),
      defineWsRoute({
        url: "teacher_get_lesson",
        handler: TeacherController.getLesson.bind(TeacherController),
        validator: TeacherGetLessonInputSchema,
        ResponseSchema: ResponseSchemas.TeacherGetLessonResponseSchema,
        description: "Generate lesson for a past session",
      }),
      defineWsRoute({
        url: "teacher_generate_syntax_lesson",
        handler: TeacherController.generateSyntaxLesson.bind(TeacherController),
        validator: TeacherGenerateSyntaxLessonInputSchema,
        ResponseSchema: ResponseSchemas.TeacherGenerateSyntaxLessonResponseSchema,
        description: "Generate a syntax lesson",
      }),
      defineWsRoute({
        url: "teacher_generate_vocabulary",
        handler: TeacherController.generateVocabulary.bind(TeacherController),
        validator: TeacherGenerateVocabularyInputSchema,
        ResponseSchema: ResponseSchemas.TeacherGenerateVocabularyResponseSchema,
        description: "Generate vocabulary collection",
      }),
      defineWsRoute({
        url: "teacher_generate_vocabulary_from_session",
        handler: TeacherController.generateVocabularyFromSession.bind(TeacherController),
        validator: TeacherGenerateVocabularyFromSessionInputSchema,
        ResponseSchema: ResponseSchemas.TeacherGenerateVocabularyResponseSchema,
        description: "Generate vocabulary from a translator session",
      }),
      defineWsRoute({
        url: "teacher_confirm_vocabulary",
        handler: TeacherController.confirmVocabulary.bind(TeacherController),
        validator: TeacherConfirmVocabularyInputSchema,
        ResponseSchema: ResponseSchemas.TeacherConfirmVocabularyResponseSchema,
        description: "Confirm and execute a pending vocabulary proposal",
      }),
      defineWsRoute({
        url: "teacher_cancel_vocabulary",
        handler: TeacherController.cancelVocabulary.bind(TeacherController),
        validator: TeacherConfirmVocabularyInputSchema,
        ResponseSchema: ResponseSchemas.TeacherConfirmVocabularyResponseSchema,
        description: "Cancel and remove a pending vocabulary proposal",
      }),
    ],
    prefix: "teacher",
    description: "Teacher routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 60,
    },
  },
  {
    group: [
      defineWsRoute({
        url: "support_open_chat",
        handler: SupportWsController.openChat.bind(SupportWsController),
        validator: SupportOpenChatInputSchema,
        ResponseSchema: ResponseSchemas.SupportOpenChatResponseSchema,
        description: "Open support chat and trigger first greeting",
      }),
      defineWsRoute({
        url: "support_chat",
        handler: SupportWsController.chat.bind(SupportWsController),
        validator: SupportChatInputSchema,
        ResponseSchema: ResponseSchemas.SupportChatResponseSchema,
        description: "Send a message to the support agent",
      }),
    ],
    prefix: "support",
    description: "Support agent routes",
    rateLimit: {
      windowMs: 1 * 60 * 1000,
      maxRequests: 60,
    },
  },
];
