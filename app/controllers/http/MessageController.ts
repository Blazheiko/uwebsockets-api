import { HttpContext } from './../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getMessages({ session, httpData, logger }: HttpContext): Promise<any> {
        logger.info('getMessages');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { contactId } = httpData.payload;
        if (!contactId) {
            return { status: 'error', message: 'Contact ID is required' };
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    {
                        AND: [
                            { senderId: userId },
                            { receiverId: contactId }
                        ]
                    },
                    {
                        AND: [
                            { senderId: contactId },
                            { receiverId: userId }
                        ]
                    }
                ]
            },
            include: {
                sender: true,
                receiver: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        return { status: 'ok', messages };
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
        if (!contactId || !content || +userId !== +sessionUserId) {
            return { status: 'error', message: 'Contact ID and content are required' };
        }

        // Verify contact exists
        const contact = await prisma.contactList.findFirst({
            where: { userId: contactId , contactId: userId }
        });

        if (!contact) {
            return { status: 'error', message: 'Contact not found or access denied' };
        }

        const message = await prisma.message.create({
            data: {
                senderId: userId,
                receiverId: contactId,
                content,
                type: 'TEXT'
            },
        });

        // Update contact's unread count
        await prisma.contactList.update({
            where: { id: contact.id },
            data: {
                unreadCount: {
                    increment: 1
                },
                updatedAt: new Date()
            }
        });

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