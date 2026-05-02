import { DateTime } from 'luxon';
import type { MessageRow, MessageWithVideoCallRow } from '#app/repositories/message-repository.js';
import type { VideoCallRow } from '#app/repositories/video-call-repository.js';

export type SerializedVideoCall = Omit<VideoCallRow, 'id' | 'callerId' | 'calleeId' | 'createdAt' | 'updatedAt' | 'startedAt' | 'endedAt'> & {
    id: string;
    callerId: string;
    calleeId: string;
    started_at: string | null;
    ended_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type SerializedMessage = Omit<MessageRow, 'id' | 'senderId' | 'receiverId' | 'calendarId' | 'videoCallId' | 'createdAt' | 'updatedAt'> & {
    id: string;
    senderId: string;
    receiverId: string;
    calendarId: string | null;
    videoCallId: string | null;
    created_at: string | null;
    updated_at: string | null;
    video_call: SerializedVideoCall | null;
};

export const messageTransformer = {
    serializeVideoCall(videoCall: VideoCallRow | null | undefined): SerializedVideoCall | null {
        if (videoCall === null || videoCall === undefined) {
            return null;
        }
        const { createdAt, updatedAt, startedAt, endedAt, id, callerId, calleeId, ...rest } = videoCall;
        return {
            ...rest,
            id: String(id),
            callerId: String(callerId),
            calleeId: String(calleeId),
            started_at: DateTime.fromJSDate(startedAt).toISO(),
            ended_at: endedAt !== null ? DateTime.fromJSDate(endedAt).toISO() : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
        };
    },

    serialize(message: MessageRow | MessageWithVideoCallRow): SerializedMessage {
        const { createdAt, updatedAt, id, senderId, receiverId, calendarId, videoCallId, ...rest } = message;
        const videoCall = 'videoCall' in message ? message.videoCall : null;
        return {
            ...rest,
            id: String(id),
            senderId: String(senderId),
            receiverId: String(receiverId),
            calendarId: calendarId !== null ? String(calendarId) : null,
            videoCallId: videoCallId !== null ? String(videoCallId) : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            video_call: messageTransformer.serializeVideoCall(videoCall),
        };
    },

    serializeArray(messagesList: (MessageRow | MessageWithVideoCallRow)[]): SerializedMessage[] {
        return messagesList.map((m) => messageTransformer.serialize(m));
    },
};
