import { HttpContext } from './../../../vendor/types/types.js';
import { getOnlineUser } from '#vendor/utils/network/ws-handlers.js';
import ContactList from '#app/models/contact-list.js';
import User from '#app/models/User.js';
import type {
    GetContactListResponse,
    CreateChatResponse,
    DeleteChatResponse,
    Contact,
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
        const contactListData = await ContactList.findByUserIdWithDetails(
            BigInt(userId),
        );

        const onlineUsers = getOnlineUser(
            contactListData.map((contact: any) => String(contact.contactId)),
        );

        return {
            status: 'ok',
            contactList: contactListData as any,
            onlineUsers,
        };
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
        try {
            await User.findById(BigInt(participantId));
        } catch (error) {
            return { status: 'error', message: 'Participant not found' };
        }

        // Check if chat already exists
        const existingChat = await ContactList.findExistingChat(
            BigInt(userId),
            BigInt(participantId),
        );

        if (existingChat) {
            return { status: 'ok', chat: existingChat as any };
        }

        const createdChat = await ContactList.createWithUserInfo(
            BigInt(userId),
            BigInt(participantId),
            'accepted',
        );

        return { status: 'ok', chat: createdChat as any };
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

        const chat = await ContactList.findByIdAndUserId(
            BigInt(chatId),
            BigInt(userId),
        );

        if (!chat) {
            return {
                status: 'error',
                message: 'Chat not found or access denied',
            };
        }

        await ContactList.delete(BigInt(chatId));

        return { status: 'ok', message: 'Chat deleted successfully' };
    },
};
