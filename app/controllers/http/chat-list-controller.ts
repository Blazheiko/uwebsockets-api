import { HttpContext } from './../../../vendor/types/types.js';
import { db } from '#database/db.js';
import { contactList, users, messages } from '#database/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { getOnlineUser } from '#vendor/utils/network/ws-handlers.js';
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
        const contactListData = await db.select({
            id: contactList.id,
            userId: contactList.userId,
            contactId: contactList.contactId,
            status: contactList.status,
            unreadCount: contactList.unreadCount,
            createdAt: contactList.createdAt,
            updatedAt: contactList.updatedAt,
            rename: contactList.rename,
            lastMessageId: contactList.lastMessageId,
            contact: {
                id: users.id,
                name: users.name,
            },
            lastMessage: messages,
        })
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .leftJoin(messages, eq(contactList.lastMessageId, messages.id))
            .where(eq(contactList.userId, BigInt(userId)))
            .orderBy(desc(contactList.updatedAt));

        const onlineUsers = getOnlineUser(
            contactListData.map((contact: any) => String(contact.contactId)),
        );

        return { status: 'ok', contactList: contactListData as any, onlineUsers };
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
        const participant = await db.select()
            .from(users)
            .where(eq(users.id, BigInt(participantId)))
            .limit(1);

        if (participant.length === 0) {
            return { status: 'error', message: 'Participant not found' };
        }

        // Check if chat already exists
        const existingChat = await db.select()
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .where(or(
                and(eq(contactList.userId, BigInt(userId)), eq(contactList.contactId, BigInt(participantId))),
                and(eq(contactList.userId, BigInt(participantId)), eq(contactList.contactId, BigInt(userId)))
            ))
            .limit(1);

        if (existingChat.length > 0) {
            return { status: 'ok', chat: existingChat[0]?.contact_list as any };
        }

        const now = new Date();
        const [chat] = await db.insert(contactList).values({
            userId: BigInt(userId),
            contactId: BigInt(participantId),
            status: 'accepted',
            createdAt: now,
            updatedAt: now,
        });

        const createdChat = await db.select()
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .where(eq(contactList.id, BigInt(chat.insertId)))
            .limit(1);

        return { status: 'ok', chat: createdChat[0]?.contact_list as any };
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

        const chat = await db.select()
            .from(contactList)
            .where(and(
                eq(contactList.id, BigInt(chatId)),
                or(
                    eq(contactList.userId, BigInt(userId)),
                    eq(contactList.contactId, BigInt(userId))
                )
            ))
            .limit(1);

        if (chat.length === 0) {
            return {
                status: 'error',
                message: 'Chat not found or access denied',
            };
        }

        await db.delete(contactList).where(eq(contactList.id, BigInt(chatId)));

        return { status: 'ok', message: 'Chat deleted successfully' };
    },
};
