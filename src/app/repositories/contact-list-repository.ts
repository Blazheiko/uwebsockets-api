import { db } from '#database/db.js';
import { contactList, messages, users } from '#database/schema.js';
import { and, desc, eq, or } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ContactListRow = InferSelectModel<typeof contactList>;
export type ContactListInsert = InferInsertModel<typeof contactList>;
export type ContactListUpdate = Partial<
    Pick<ContactListInsert, 'status' | 'rename' | 'unreadCount' | 'lastMessageId' | 'lastMessageAt'>
>;

export interface ContactListWithDetails {
    id: bigint;
    userId: bigint;
    contactId: bigint;
    status: string;
    unreadCount: number;
    createdAt: Date;
    updatedAt: Date;
    rename: string | null;
    lastMessageId: bigint | null;
    lastMessageAt: Date;
    contact: { id: bigint | null; name: string | null; avatar: string | null } | null;
    lastMessage: InferSelectModel<typeof messages> | null;
}

export interface IContactListRepository {
    create(data: ContactListInsert): Promise<ContactListRow>;
    findById(id: bigint): Promise<ContactListRow | undefined>;
    findByUserId(userId: bigint): Promise<ContactListRow[]>;
    findByUserIdWithDetails(userId: bigint): Promise<ContactListWithDetails[]>;
    findExistingChat(userId: bigint, participantId: bigint): Promise<ContactListRow | undefined>;
    findByIdAndUserId(chatId: bigint, userId: bigint): Promise<ContactListRow | undefined>;
    findOpponentUserIds(userId: bigint): Promise<string[]>;
    createWithUserInfo(
        userId: bigint,
        participantId: bigint,
        status?: string,
    ): Promise<ContactListRow | undefined>;
    update(id: bigint, data: ContactListUpdate): Promise<ContactListRow | undefined>;
    delete(id: bigint): Promise<boolean>;
    resetUnreadCount(userId: bigint, contactId: bigint): Promise<void>;
}

export const contactListRepository: IContactListRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(contactList).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
            lastMessageAt: data.lastMessageAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create contact list entry');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(contactList)
            .where(eq(contactList.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByUserId(userId) {
        return await db.select().from(contactList).where(eq(contactList.userId, userId));
    },

    async findByUserIdWithDetails(userId) {
        return await db
            .select({
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
                contact: { id: users.id, name: users.name, avatar: users.avatar },
                lastMessage: messages,
            })
            .from(contactList)
            .leftJoin(users, eq(contactList.contactId, users.id))
            .leftJoin(messages, eq(contactList.lastMessageId, messages.id))
            .where(eq(contactList.userId, userId))
            .orderBy(desc(contactList.updatedAt));
    },

    async findExistingChat(userId, participantId) {
        const result = await db
            .select()
            .from(contactList)
            .where(
                or(
                    and(eq(contactList.userId, userId), eq(contactList.contactId, participantId)),
                    and(eq(contactList.userId, participantId), eq(contactList.contactId, userId)),
                ),
            )
            .limit(1);
        return result.at(0);
    },

    async findOpponentUserIds(userId) {
        const rows = await db
            .select({ contactId: contactList.contactId })
            .from(contactList)
            .where(eq(contactList.userId, userId));
        return rows.map((row) => String(row.contactId));
    },

    async findByIdAndUserId(chatId, userId) {
        const result = await db
            .select()
            .from(contactList)
            .where(
                and(
                    eq(contactList.id, chatId),
                    or(eq(contactList.userId, userId), eq(contactList.contactId, userId)),
                ),
            )
            .limit(1);
        return result.at(0);
    },

    async createWithUserInfo(userId, participantId, status = 'accepted') {
        const now = new Date();
        const [created] = await db.insert(contactList).values({
            userId,
            contactId: participantId,
            status,
            createdAt: now,
            updatedAt: now,
        }).returning();
        return created;
    },

    async update(id, data) {
        await db
            .update(contactList)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(contactList.id, id));
        return contactListRepository.findById(id);
    },

    async delete(id) {
        const deleted = await db.delete(contactList).where(eq(contactList.id, id)).returning();
        return deleted.length > 0;
    },

    async resetUnreadCount(userId, contactId) {
        await db
            .update(contactList)
            .set({ unreadCount: 0 })
            .where(and(eq(contactList.userId, userId), eq(contactList.contactId, contactId)));
    },
};
