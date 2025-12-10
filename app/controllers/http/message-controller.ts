import { HttpContext } from './../../../vendor/types/types.js';
import sendMessage from '#app/servises/chat/send-message.js';
import getChatMessages from '#app/servises/chat/get-chat-messages.js';
import Message from '#app/models/Message.js';
import type {
    GetMessagesResponse,
    SendMessageResponse,
    DeleteMessageResponse,
    EditMessageResponse,
    MarkAsReadResponse,
} from '../types/ChatListController.js';

export default {
    async getMessages({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<GetMessagesResponse> {
        logger.info('getMessages');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const { contactId, userId } = httpData.payload;
        const sessionUserId = sessionInfo.data?.userId;
        if (!userId || !sessionUserId || +userId !== +sessionUserId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        if (!contactId) {
            return { status: 'error', message: 'Contact ID is required' };
        }

        const data = await getChatMessages(userId, contactId);
        if (!data) {
            return { status: 'error', message: 'Messages not found' };
        }

        return { status: 'ok', ...data };
    },

    async sendChatMessage({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<SendMessageResponse> {
        logger.info('sendChatMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const sessionUserId = sessionInfo.data?.userId;
        if (!sessionUserId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        const { contactId, content, userId } = httpData.payload;
        logger.info(httpData.payload);
        logger.info({ userId });
        if (!contactId || !content || +userId !== +sessionUserId || !userId) {
            return {
                status: 'error',
                message: 'Contact ID, content and user ID are required',
            };
        }

        const message = await sendMessage(content, userId, contactId);

        return { status: 'ok', message };
    },

    async deleteMessage({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<DeleteMessageResponse> {
        logger.info('deleteMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        const { messageId } = httpData.params;
        if (!messageId) {
            return { status: 'error', message: 'Message ID is required' };
        }

        const message = await Message.findByIdAndUserId(
            messageId,
            userId,
            'sender',
        );
        if (!message) {
            return {
                status: 'error',
                message: 'Message not found or access denied',
            };
        }

        await Message.deleteById(messageId);

        return { status: 'ok', message: 'Message deleted successfully' };
    },

    async editMessage({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<EditMessageResponse> {
        logger.info('editMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const { messageId, content, userId } = httpData.payload;
        const sessionUserId = sessionInfo.data?.userId;
        if (!userId || +userId !== +sessionUserId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        if (!messageId || !content) {
            return {
                status: 'error',
                message: 'Message ID and content are required',
            };
        }

        // const message = await Message.findByIdAndUserId(messageId, userId, 'sender');
        // if (!message) {
        //     return { status: 'error', message: 'Message not found or access denied' };
        // }

        const updatedMessage = await Message.updateContent(
            userId,
            messageId,
            content,
        );

        return {
            status: updatedMessage ? 'ok' : 'error',
            message: updatedMessage,
        };
    },

    async markAsRead({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<MarkAsReadResponse> {
        logger.info('markAsRead');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        const { messageId } = httpData.payload;
        if (!messageId) {
            return { status: 'error', message: 'Message ID is required' };
        }

        const message = await Message.findByIdAndUserId(
            messageId,
            userId,
            'receiver',
        );
        if (!message) {
            return {
                status: 'error',
                message: 'Message not found or access denied',
            };
        }

        try {
            const result = await Message.markAsRead(messageId, userId);
            return { status: 'ok', message: result };
        } catch (error) {
            logger.error({ err: error }, 'Error marking message as read:');
            return {
                status: 'error',
                message: 'Failed to mark message as read',
            };
        }
    },
};
