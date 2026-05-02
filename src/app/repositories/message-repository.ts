import { db } from '#database/db.js';
import { contactList, messages, videoCalls } from '#database/schema.js';
import { and, eq, or, sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { VideoCallRow } from './video-call-repository.js';

export type MessageRow = InferSelectModel<typeof messages>;
export type MessageInsert = InferInsertModel<typeof messages>;
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'VIDEO_CALL';
export interface MessageWithVideoCallRow extends MessageRow {
    videoCall: VideoCallRow | null;
}

export interface IMessageRepository {
    create(data: MessageInsert): Promise<MessageRow>;
    createVideoCallMessage(data: {
        senderId: bigint;
        receiverId: bigint;
        videoCallId: bigint;
        content: string;
    }): Promise<MessageRow>;
    findById(id: bigint): Promise<MessageRow | undefined>;
    findByIdWithVideoCall(id: bigint): Promise<MessageWithVideoCallRow | undefined>;
    findByVideoCallId(videoCallId: bigint): Promise<MessageRow | undefined>;
    findByVideoCallIdWithVideoCall(videoCallId: bigint): Promise<MessageWithVideoCallRow | undefined>;
    findByIdAndUserId(
        id: bigint,
        userId: bigint,
        userType: 'sender' | 'receiver',
    ): Promise<MessageRow | undefined>;
    findConversation(userId1: bigint, userId2: bigint): Promise<MessageWithVideoCallRow[]>;
    markAllAsRead(userId: bigint, contactId: bigint): Promise<void>;
    markAsRead(messageId: bigint, userId: bigint): Promise<MessageRow | undefined>;
    getUnreadCount(userId: bigint): Promise<number>;
    deleteById(id: bigint): Promise<boolean>;
    updateContent(userId: bigint, id: bigint, content: string): Promise<MessageRow | undefined>;
    incrementUnreadCount(receiverId: bigint, senderId: bigint): Promise<void>;
    decrementUnreadCount(userId: bigint, contactId: bigint): Promise<void>;
}

export const messageRepository: IMessageRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(messages).values({
            ...data,
            createdAt: now,
            updatedAt: now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create message');
        }
        return created;
    },

    async createVideoCallMessage(data) {
        return await messageRepository.create({
            senderId: data.senderId,
            receiverId: data.receiverId,
            videoCallId: data.videoCallId,
            content: data.content,
            type: 'VIDEO_CALL',
        });
    },

    async findById(id) {
        return await db
            .select()
            .from(messages)
            .where(eq(messages.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByIdWithVideoCall(id) {
        return await db
            .select({
                message: messages,
                videoCall: videoCalls,
            })
            .from(messages)
            .leftJoin(videoCalls, eq(messages.videoCallId, videoCalls.id))
            .where(eq(messages.id, id))
            .limit(1)
            .then((rows) => {
                const row = rows.at(0);
                if (row === undefined) return undefined;
                return {
                    ...row.message,
                    videoCall: row.videoCall,
                };
            });
    },

    async findByVideoCallId(videoCallId) {
        return await db
            .select()
            .from(messages)
            .where(eq(messages.videoCallId, videoCallId))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByVideoCallIdWithVideoCall(videoCallId) {
        return await db
            .select({
                message: messages,
                videoCall: videoCalls,
            })
            .from(messages)
            .leftJoin(videoCalls, eq(messages.videoCallId, videoCalls.id))
            .where(eq(messages.videoCallId, videoCallId))
            .limit(1)
            .then((rows) => {
                const row = rows.at(0);
                if (row === undefined) return undefined;
                return {
                    ...row.message,
                    videoCall: row.videoCall,
                };
            });
    },

    async findByIdAndUserId(id, userId, userType) {
        const condition =
            userType === 'sender'
                ? and(eq(messages.id, id), eq(messages.senderId, userId))
                : and(eq(messages.id, id), eq(messages.receiverId, userId));
        return await db
            .select()
            .from(messages)
            .where(condition)
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findConversation(userId1, userId2) {
        const rows = await db
            .select({
                message: messages,
                videoCall: videoCalls,
            })
            .from(messages)
            .leftJoin(videoCalls, eq(messages.videoCallId, videoCalls.id))
            .where(
                or(
                    and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
                    and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1)),
                ),
            )
            .orderBy(messages.createdAt);

        return rows.map((row) => ({
            ...row.message,
            videoCall: row.videoCall,
        }));
    },

    async markAllAsRead(userId, contactId) {
        await db
            .update(messages)
            .set({ isRead: true })
            .where(and(eq(messages.senderId, contactId), eq(messages.receiverId, userId)));
    },

    async markAsRead(messageId, userId) {
        const message = await messageRepository.findById(messageId);
        if (message?.receiverId !== userId) {
            return undefined;
        }
        await db
            .update(messages)
            .set({ isRead: true })
            .where(eq(messages.id, messageId));
        return messageRepository.findById(messageId);
    },

    async getUnreadCount(userId) {
        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
        return result.at(0)?.count ?? 0;
    },

    async deleteById(id) {
        const deleted = await db.delete(messages).where(eq(messages.id, id)).returning();
        return deleted.length > 0;
    },

    async updateContent(userId, id, content) {
        await db
            .update(messages)
            .set({ content, updatedAt: new Date() })
            .where(and(eq(messages.id, id), eq(messages.senderId, userId)));
        return messageRepository.findById(id);
    },

    async incrementUnreadCount(receiverId, senderId) {
        await db
            .update(contactList)
            .set({ unreadCount: sql`${contactList.unreadCount} + 1` })
            .where(
                and(eq(contactList.userId, receiverId), eq(contactList.contactId, senderId)),
            );
    },

    async decrementUnreadCount(userId, contactId) {
        await db
            .update(contactList)
            .set({ unreadCount: sql`${contactList.unreadCount} - 1` })
            .where(
                and(eq(contactList.userId, userId), eq(contactList.contactId, contactId)),
            );
    },
};
