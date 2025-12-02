import { db } from '#database/db.js';
import { messages, contactList, users } from '#database/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['senderId', 'receiverId', 'content', 'type'];
const hidden: string[] = [];

const messageTypes = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'] as const;

export default {
    async create(payload: any) {
        if (!payload || typeof payload !== 'object')
            return new Error('Payload must be object');

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        // Validate message type
        if (!messageTypes.includes(payload.type)) {
            throw new Error('Invalid message type');
        }

        // Validate src for media types
        if (payload.type !== 'TEXT' && !payload.src) {
            throw new Error('Source URL is required for media messages');
        }

        // Create message and update unread count
        const now = new Date();
        const [message] = await db.insert(messages).values({
            senderId: BigInt(payload.senderId),
            receiverId: BigInt(payload.receiverId),
            type: payload.type,
            content: payload.content,
            src: payload.src || null,
            isRead: false,
            createdAt: now,
            updatedAt: now,
        });

        // Update unread count in contact list
        await db
            .update(contactList)
            .set({ unreadCount: sql`${contactList.unreadCount} + 1` })
            .where(
                and(
                    eq(contactList.userId, BigInt(payload.receiverId)),
                    eq(contactList.contactId, BigInt(payload.senderId)),
                ),
            );

        // Get created message with relations
        const createdMessage = await db
            .select({
                message: messages,
                sender: users,
            })
            .from(messages)
            .leftJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.id, BigInt(message.insertId)))
            .limit(1);

        return serializeModel(createdMessage[0].message, schema, hidden);
    },

    async findById(id: bigint) {
        const message = await db
            .select()
            .from(messages)
            .where(eq(messages.id, id))
            .limit(1);

        if (message.length === 0) {
            throw new Error(`Message with id ${id} not found`);
        }

        return serializeModel(message[0], schema, hidden);
    },

    async update(id: bigint, payload: any) {
        const updateData = {
            ...payload,
            updatedAt: new Date(),
        };

        await db.update(messages).set(updateData).where(eq(messages.id, id));
        const message = await db
            .select()
            .from(messages)
            .where(eq(messages.id, id))
            .limit(1);

        return serializeModel(message[0], schema, hidden);
    },
    async readedMessages(userId: bigint, contactId: bigint) {
        const result = await db
            .update(messages)
            .set({ isRead: true })
            .where( and(
                eq(messages.senderId, contactId), 
                eq(messages.receiverId, userId))
            );
        return result;
    },

    async findConversation(userId1: bigint, userId2: bigint) {
        const messagesData = await db
            .select()
            .from(messages)
            .where(
                or(
                    and(
                        eq(messages.senderId, userId1),
                        eq(messages.receiverId, userId2),
                    ),
                    and(
                        eq(messages.senderId, userId2),
                        eq(messages.receiverId, userId1),
                    ),
                ),
            )
            .orderBy(messages.createdAt);

        return this.serializeArray(messagesData);
    },

    async markAsRead(messageId: bigint, userId: bigint) {
        // Get message to find sender
        const message = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

        if (message.length === 0) {
            throw new Error(`Message with id ${messageId} not found`);
        }

        if (message[0].receiverId !== userId) {
            throw new Error('User is not the receiver of this message');
        }

        // Update message status
        await db
            .update(messages)
            .set({ isRead: true })
            .where(eq(messages.id, messageId));

        // Update unread count in contact list
        await db
            .update(contactList)
            .set({ unreadCount: sql`${contactList.unreadCount} - 1` })
            .where(
                and(
                    eq(contactList.userId, userId),
                    eq(contactList.contactId, message[0].senderId),
                ),
            );

        const updatedMessage = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);
        return serializeModel(updatedMessage[0], schema, hidden);
    },

    async getUnreadCount(userId: bigint) {
        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .where(
                and(
                    eq(messages.receiverId, userId),
                    eq(messages.isRead, false),
                ),
            );

        return result[0]?.count || 0;
    },

    query() {
        return db.select().from(messages);
    },

    serialize(message: any) {
        return serializeModel(message, schema, hidden);
    },

    serializeArray(messagesData: any) {
        return messagesData.map((message: any) =>
            serializeModel(message, schema, hidden),
        );
    },

    async findByIdAndUserId(
        messageId: bigint,
        userId: bigint,
        userType: 'sender' | 'receiver',
    ) {
        const whereCondition =
            userType === 'sender'
                ? and(eq(messages.id, messageId), eq(messages.senderId, userId))
                : and(
                      eq(messages.id, messageId),
                      eq(messages.receiverId, userId),
                  );

        const message = await db
            .select()
            .from(messages)
            .where(whereCondition)
            .limit(1);

        if (message.length === 0) {
            return null;
        }

        return serializeModel(message[0], schema, hidden);
    },

    async deleteById(messageId: bigint) {
        const result = await db
            .delete(messages)
            .where(eq(messages.id, messageId));
        return result;
    },

    async updateContent(userId: bigint, messageId: bigint, content: string) {
        try {
            await db
                .update(messages)
                .set({ content, updatedAt: new Date() })
                .where(
                    and(
                        eq(messages.id, messageId),
                        eq(messages.senderId, userId),
                    ),
                );

            const updatedMessage = await db
                .select()
                .from(messages)
                .where(eq(messages.id, messageId))
                .limit(1);

            if (updatedMessage.length === 0) {
                return null;
            }

            return serializeModel(updatedMessage[0], schema, hidden);
        } catch (error: any) {
            throw error;
        }
    },
};
