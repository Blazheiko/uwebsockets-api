import logger from '#logger';
import { HttpContext } from './../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getChatList({ session }: HttpContext): Promise<any> {
        logger.info('getChatList');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        // Получаем данные текущего пользователя
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        if (!user) {
            return { status: 'error', message: 'User not found' };
        }

        // Получаем список чатов с контактами
        const chats = await prisma.contactList.findMany({
            where: {
                OR: [
                    { userId },
                    { contactId: userId }
                ]
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return { 
            status: 'ok',
            user,
            chats
        };
    },

    async createChat({ session, httpData }: HttpContext): Promise<any> {
        logger.info('createChat');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { participantId } = httpData.payload;
        if (!participantId) {
            return { status: 'error', message: 'Participant ID is required' };
        }

        // Check if participant exists
        const participant = await prisma.user.findUnique({
            where: { id: participantId }
        });

        if (!participant) {
            return { status: 'error', message: 'Participant not found' };
        }

        // Check if chat already exists
        const existingChat = await prisma.contactList.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            { userId },
                            { contactId: participantId }
                        ]
                    },
                    {
                        AND: [
                            { userId: participantId },
                            { contactId: userId }
                        ]
                    }
                ]
            },
            include: {
                user: true,
                contact: true
            }
        });

        if (existingChat) {
            return { status: 'ok', chat: existingChat };
        }

        const chat = await prisma.contactList.create({
            data: {
                userId,
                contactId: participantId,
                status: 'accepted'
            },
            include: {
                user: true,
                contact: true
            }
        });

        return { status: 'ok', chat };
    },

    async deleteChat({ session, httpData }: HttpContext): Promise<any> {
        logger.info('deleteChat');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'User ID not found' };
        }

        const { chatId } = httpData.payload;
        if (!chatId) {
            return { status: 'error', message: 'Chat ID is required' };
        }

        const chat = await prisma.contactList.findFirst({
            where: {
                id: chatId,
                OR: [
                    { userId },
                    { contactId: userId }
                ]
            }
        });

        if (!chat) {
            return { status: 'error', message: 'Chat not found or access denied' };
        }

        await prisma.contactList.delete({
            where: { id: chatId }
        });

        return { status: 'ok', message: 'Chat deleted successfully' };
    },
}; 