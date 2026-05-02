import logger from '#logger';
import {
    contactListRepository,
    messageRepository,
    videoCallRepository,
} from '#app/repositories/index.js';
import { messageTransformer } from '#app/transformers/index.js';
import { broadcastService } from '#app/services/broadcast-service.js';
import { failure, success } from '#app/services/shared/service-result.js';
import type { ServiceResult } from '#app/services/shared/service-result.js';
import type { UserConnection } from '#vendor/types/types.js';
import { isCanonicalEntityId } from '#vendor/utils/helpers/entity-id.js';

function toPositiveBigInt(value: string | undefined): bigint | null {
    if (value === undefined || !/^\d+$/.test(value)) return null;
    try {
        const normalized = BigInt(value);
        return normalized > 0n ? normalized : null;
    } catch {
        return null;
    }
}

export const videoCallMessageService = {
    async startVideoCallLog(
        sessionUserId: string | undefined,
        targetUserId: string,
        userData?: UserConnection,
    ): Promise<ServiceResult<{ message: ReturnType<typeof messageTransformer.serialize> }>> {
        const callerId = toPositiveBigInt(sessionUserId);
        const calleeId = toPositiveBigInt(targetUserId);

        if (callerId === null) {
            return failure('UNAUTHORIZED', 'Session expired');
        }
        if (calleeId === null) {
            return failure('BAD_REQUEST', 'Target user ID is required');
        }

        const activeVideoCallId = toPositiveBigInt(userData?.videoCallId);
        const activePeerUserId = toPositiveBigInt(userData?.videoCallPeerUserId);
        if (activeVideoCallId !== null && activePeerUserId === calleeId) {
            const existingMessage = await messageRepository.findByVideoCallIdWithVideoCall(activeVideoCallId);
            if (existingMessage !== undefined) {
                return success({
                    message: messageTransformer.serialize(existingMessage),
                });
            }
        }

        const [senderContacts, receiverContacts] = await Promise.all([
            contactListRepository.findByUserId(callerId),
            contactListRepository.findByUserId(calleeId),
        ]);

        const senderChat = senderContacts.find((c) => c.contactId === calleeId);
        if (senderChat === undefined) {
            return failure('NOT_FOUND', 'Chat not found');
        }
        const receiverChat = receiverContacts.find((c) => c.contactId === callerId);

        const startedAt = new Date();
        const videoCall = await videoCallRepository.create({
            callerId,
            calleeId,
            startedAt,
        });

        const message = await messageRepository.createVideoCallMessage({
            senderId: callerId,
            receiverId: calleeId,
            videoCallId: videoCall.id,
            content: 'Video call',
        });

        await Promise.all([
            contactListRepository.update(senderChat.id, {
                lastMessageId: message.id,
                lastMessageAt: startedAt,
            }),
            receiverChat !== undefined
                ? contactListRepository.update(receiverChat.id, {
                    lastMessageId: message.id,
                    lastMessageAt: startedAt,
                })
                : Promise.resolve(undefined),
        ]);

        if (userData !== undefined) {
            userData.videoCallId = String(videoCall.id);
            userData.videoCallPeerUserId = String(calleeId);
        }

        const linkedMessage = await messageRepository.findByIdWithVideoCall(message.id);
        const serialized = messageTransformer.serialize(linkedMessage ?? { ...message, videoCall });

        broadcastService.broadcastMessageToUser(String(calleeId), 'new_message', {
            message: serialized,
        });
        broadcastService.broadcastMessageToUser(String(callerId), 'new_message', {
            message: serialized,
        });

        return success({ message: serialized });
    },

    async finishVideoCallLog(
        sessionUserId: string | undefined,
        targetUserId: string,
        videoCallIdValue: string,
        userData?: UserConnection,
    ): Promise<ServiceResult<{ message: ReturnType<typeof messageTransformer.serialize> }>> {
        const callerId = toPositiveBigInt(sessionUserId);
        const calleeId = toPositiveBigInt(targetUserId);
        const videoCallId = toPositiveBigInt(videoCallIdValue);

        if (callerId === null) {
            return failure('UNAUTHORIZED', 'Session expired');
        }
        if (calleeId === null || videoCallId === null) {
            return failure('BAD_REQUEST', 'Video call ID and target user ID are required');
        }

        const videoCall = await videoCallRepository.findById(videoCallId);
        if (videoCall?.callerId !== callerId || videoCall.calleeId !== calleeId) {
            return failure('NOT_FOUND', 'Video call record not found or access denied');
        }

        const existingLinkedMessage = await messageRepository.findByVideoCallId(videoCallId);
        if (existingLinkedMessage === undefined) {
            return failure('CONFLICT', 'Linked video call message not found');
        }

        if (videoCall.endedAt !== null) {
            const existingSerialized = await messageRepository.findByIdWithVideoCall(existingLinkedMessage.id)
                .then((row) => messageTransformer.serialize(row ?? { ...existingLinkedMessage, videoCall }));

            if (userData !== undefined) {
                delete userData.videoCallId;
                delete userData.videoCallPeerUserId;
            }

            return success({ message: existingSerialized });
        }

        const finishedAt = new Date();
        const updatedVideoCall = await videoCallRepository.finish({
            id: videoCallId,
            callerId,
            calleeId,
            endedAt: finishedAt,
        });

        if (updatedVideoCall === undefined) {
            return failure('CONFLICT', 'Failed to finish video call');
        }

        const conversationMessage = await messageRepository.findByIdWithVideoCall(existingLinkedMessage.id);
        const serialized = messageTransformer.serialize(
            conversationMessage ?? { ...existingLinkedMessage, videoCall: updatedVideoCall },
        );

        if (userData !== undefined) {
            delete userData.videoCallId;
            delete userData.videoCallPeerUserId;
        }

        broadcastService.broadcastMessageToUser(String(calleeId), 'message_updated', {
            message: serialized,
        });
        broadcastService.broadcastMessageToUser(String(callerId), 'message_updated', {
            message: serialized,
        });

        return success({ message: serialized });
    },

    async finishVideoCallLogOnDisconnect(data: {
        callerUserId: string | undefined;
        targetUserId: string | undefined;
        videoCallId: string | undefined;
    }): Promise<void> {
        const { callerUserId, targetUserId, videoCallId } = data;
        if (
            !isCanonicalEntityId(callerUserId) ||
            !isCanonicalEntityId(targetUserId) ||
            !isCanonicalEntityId(videoCallId)
        ) {
            return;
        }

        try {
            const result = await videoCallMessageService.finishVideoCallLog(
                callerUserId,
                targetUserId,
                videoCallId,
            );
            if (!result.ok) {
                logger.warn(
                    { callerId: callerUserId, calleeId: targetUserId, videoCallId, code: result.code, message: result.message },
                    'finishVideoCallLogOnDisconnect: unable to finish video call',
                );
            }
        } catch (error) {
            logger.error(
                { err: error, callerId: callerUserId, calleeId: targetUserId, videoCallId },
                'finishVideoCallLogOnDisconnect: unexpected error',
            );
        }
    },
};
