import { HttpContext } from './../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';
import { getOnlineUser } from '#vendor/utils/routing/ws-router.js';
import type {
    GetContactListResponse,
    CreateChatResponse,
    DeleteChatResponse,
} from '../types/ChatListController.js';
export default {
    async getContactList({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<GetContactListResponse> {
        logger.info('getChatList');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo)
            return { status: 'error', message: 'Session not found' };

        const sessionUserId = sessionInfo.data?.userId;
        const userId = httpData.payload?.userId;
        if (!userId || !sessionUserId)
            return { status: 'unauthorized', message: 'Session expired' };

        if (+userId !== +sessionUserId) {
            logger.error('User used the wrong session');
            return {
                status: 'unauthorized',
                message: 'Session expired',
            };
        }

        // Get chat list with contacts
        const contactList = await prisma.contactList.findMany({
            where: { userId },
            include: {
                contact: {
                    select: { id: true, name: true },
                },
                lastMessage: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        const onlineUsers = getOnlineUser(
            contactList.map((contact) => Number(contact.contactId)),
        );

        return { status: 'ok', contactList, onlineUsers };
    },

    async createChat({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<CreateChatResponse> {
        logger.info('createChat');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        const { participantId } = httpData.payload;
        if (!participantId) {
            return { status: 'error', message: 'Participant ID is required' };
        }

        // Check if participant exists
        const participant = await prisma.user.findUnique({
            where: { id: participantId },
        });

        if (!participant) {
            return { status: 'error', message: 'Participant not found' };
        }

        // Check if chat already exists
        const existingChat = await prisma.contactList.findFirst({
            where: {
                OR: [
                    {
                        AND: [{ userId }, { contactId: participantId }],
                    },
                    {
                        AND: [{ userId: participantId }, { contactId: userId }],
                    },
                ],
            },
            include: {
                user: true,
                contact: true,
            },
        });

        if (existingChat) {
            return { status: 'ok', chat: existingChat };
        }

        const chat = await prisma.contactList.create({
            data: {
                userId,
                contactId: participantId,
                status: 'accepted',
            },
            include: {
                user: true,
                contact: true,
            },
        });

        return { status: 'ok', chat };
    },

    async deleteChat({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<DeleteChatResponse> {
        logger.info('deleteChat');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            return { status: 'unauthorized', message: 'Session expired' };
        }

        const { chatId } = httpData.payload;
        if (!chatId) {
            return { status: 'error', message: 'Chat ID is required' };
        }

        const chat = await prisma.contactList.findFirst({
            where: {
                id: chatId,
                OR: [{ userId }, { contactId: userId }],
            },
        });

        if (!chat) {
            return {
                status: 'error',
                message: 'Chat not found or access denied',
            };
        }

        await prisma.contactList.delete({
            where: { id: chatId },
        });

        return { status: 'ok', message: 'Chat deleted successfully' };
    },
};
