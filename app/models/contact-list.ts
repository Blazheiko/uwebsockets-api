import { db } from '#database/db.js';
import { contactList, users, messages } from '#database/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    last_message_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['userId', 'contactId'];
const hidden: string[] = [];

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

        // Check if contact already exists
        const existingContact = await db
            .select()
            .from(contactList)
            .where(
                and(
                    eq(contactList.userId, BigInt(payload.userId)),
                    eq(contactList.contactId, BigInt(payload.contactId)),
                ),
            )
            .limit(1);

        if (existingContact.length > 0) {
            throw new Error('Contact already exists in contact list');
        }

        let contact = null;
        try {
            const now = new Date();
            const [result] = await db.insert(contactList).values({
                userId: BigInt(payload.userId),
                contactId: BigInt(payload.contactId),
                status: payload.status || 'pending',
                rename: payload.rename || null,
                createdAt: now,
                updatedAt: now,
            });

            // Get created contact with user data
            const createdContact = await db
                .select()
                .from(contactList)
                .where(eq(contactList.id, BigInt(result.insertId)))
                .limit(1);

            contact = createdContact[0];
        } catch (e) {
            logger.error({ err: e });
            throw new Error('Error creating contact');
        }

        return serializeModel(contact, schema, hidden);
    },

    async findById(id: bigint) {
        const contact = await db
            .select()
            .from(contactList)
            .where(eq(contactList.id, id))
            .limit(1);

        if (contact.length === 0) {
            throw new Error(`Contact list entry with id ${id} not found`);
        }

        return serializeModel(contact[0], schema, hidden);
    },

    async resetUnreadCount(userId: bigint, contactId: bigint) {
        const result = await db
            .update(contactList)
            .set({ unreadCount: 0 })
            .where(and(
                eq(contactList.userId, BigInt(userId)),
                eq(contactList.contactId, BigInt(contactId))
            ));
            
        return result;
    },

    async update(id: bigint, payload: any) {
        const updateData = {
            ...payload,
            updatedAt: new Date(),
        };

        await db
            .update(contactList)
            .set(updateData)
            .where(eq(contactList.id, id));
        const contact = await db
            .select()
            .from(contactList)
            .where(eq(contactList.id, id))
            .limit(1);
        return serializeModel(contact[0], schema, hidden);
    },

    async delete(id: bigint) {
        const result = await db
            .delete(contactList)
            .where(eq(contactList.id, id));
        return result;
    },

    async findByUserId(userId: bigint) {
        const contacts = await db
            .select()
            .from(contactList)
            .where(eq(contactList.userId, userId));
        return this.serializeArray(contacts);
    },

    async findByUserIdWithDetails(userId: bigint) {
        logger.info(`find contact list with details for user: ${userId}`);

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
            lastMessageAt: contactList.lastMessageAt,
            contact: {
                id: users.id,
                name: users.name,
            },
            lastMessage: messages,
        })
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .leftJoin(messages, eq(contactList.lastMessageId, messages.id))
            .where(eq(contactList.userId, userId))
            .orderBy(desc(contactList.updatedAt));

        return contactListData;
    },

    async findExistingChat(userId: bigint, participantId: bigint) {
        logger.info(`find existing chat between users: ${userId} and ${participantId}`);

        const existingChat = await db.select()
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .where(or(
                and(eq(contactList.userId, userId), eq(contactList.contactId, participantId)),
                and(eq(contactList.userId, participantId), eq(contactList.contactId, userId))
            ))
            .limit(1);

        if (existingChat.length === 0) {
            return null;
        }

        return existingChat[0]?.contact_list;
    },

    async findByIdAndUserId(chatId: bigint, userId: bigint) {
        logger.info(`find chat by id: ${chatId} for user: ${userId}`);

        const chat = await db.select()
            .from(contactList)
            .where(and(
                eq(contactList.id, chatId),
                or(
                    eq(contactList.userId, userId),
                    eq(contactList.contactId, userId)
                )
            ))
            .limit(1);

        if (chat.length === 0) {
            return null;
        }

        return chat[0];
    },

    async createWithUserInfo(userId: bigint, participantId: bigint, status: string = 'accepted') {
        logger.info(`create chat for user: ${userId} with participant: ${participantId}`);

        const now = new Date();
        const [chat] = await db.insert(contactList).values({
            userId: userId,
            contactId: participantId,
            status: status,
            createdAt: now,
            updatedAt: now,
        });

        const createdChat = await db.select()
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .where(eq(contactList.id, BigInt(chat.insertId)))
            .limit(1);

        return createdChat[0]?.contact_list;
    },

    query() {
        return db.select().from(contactList);
    },

    serialize(contact: any) {
        return serializeModel(contact, schema, hidden);
    },

    serializeArray(contacts: any) {
        return contacts.map((contact: any) =>
            serializeModel(contact, schema, hidden),
        );
    },
};
