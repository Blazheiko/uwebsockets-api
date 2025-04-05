import { HttpContext } from './../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';
import sendMessage from '#app/servises/chat/sendMessage.js';
import getChatMessages from '#app/servises/chat/getChatMessages.js';

export default {
    async getMessages({ session, httpData, logger }: HttpContext): Promise<any> {
        logger.info('getMessages');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const { contactId, userId } = httpData.payload;
        const sessionUserId = sessionInfo.data?.userId;
        if (!userId || !sessionUserId || +userId !== +sessionUserId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        if (!contactId) {
            return { status: 'error', message: 'Contact ID is required' };
        }

        const data = await getChatMessages(userId, contactId);
        if (!data) {
            return { status: 'error', message: 'Messages not found' };
        }

        return { status: 'ok', messages: data.messages, contact: data.contact };
    },

    async sendMessage({ session, httpData, logger }: HttpContext): Promise<any> {
        logger.info('sendMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const sessionUserId = sessionInfo.data?.userId;
        if (!sessionUserId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { contactId, content, userId } = httpData.payload;
        logger.info(httpData.payload);
        logger.info({ userId });
        if (!contactId || !content || +userId !== +sessionUserId) {
            return { status: 'error', message: 'Contact ID and content are required' };
        }

        const message = await sendMessage(content, userId, contactId);

        return { status: 'ok', message };
    },

    async deleteMessage({ session, httpData, logger }: HttpContext): Promise<any> {
        logger.info('deleteMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { messageId } = httpData.payload;
        if (!messageId) {
            return { status: 'error', message: 'Message ID is required' };
        }

        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                senderId: userId
            }
        });

        if (!message) {
            return { status: 'error', message: 'Message not found or access denied' };
        }

        await prisma.message.delete({
            where: { id: messageId }
        });

        return { status: 'ok', message: 'Message deleted successfully' };
    },

    async editMessage({ session, httpData, logger}: HttpContext): Promise<any> {
        logger.info('editMessage');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { messageId, content } = httpData.payload;
        if (!messageId || !content) {
            return { status: 'error', message: 'Message ID and content are required' };
        }

        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                senderId: userId
            }
        });

        if (!message) {
            return { status: 'error', message: 'Message not found or access denied' };
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: {
                content,
                updatedAt: new Date()
            },
            include: {
                sender: true,
                receiver: true
            }
        });

        return { status: 'ok', message: updatedMessage };
    },

    async markAsRead({ session, httpData, logger }: HttpContext): Promise<any> {
        logger.info('markAsRead');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { messageId } = httpData.payload;
        if (!messageId) {
            return { status: 'error', message: 'Message ID is required' };
        }

        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                receiverId: userId
            }
        });

        if (!message) {
            return { status: 'error', message: 'Message not found or access denied' };
        }

        // Start transaction to update message and contact list
        const result = await prisma.$transaction(async (prisma) => {
            // Update message status
            const updatedMessage = await prisma.message.update({
                where: { id: messageId },
                data: { isRead: true },
                include: {
                    sender: true,
                    receiver: true
                }
            });

            // Update unread count in contact list
            await prisma.contactList.update({
                where: {
                    userId_contactId: {
                        userId: userId,
                        contactId: message.senderId
                    }
                },
                data: {
                    unreadCount: {
                        decrement: 1
                    }
                }
            });

            return updatedMessage;
        });

        return { status: 'ok', message: result };
    },
}; 