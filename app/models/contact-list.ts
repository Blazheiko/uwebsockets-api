import { db } from '#database/db.js';
import { contactList, users } from '#database/schema.js';
import { eq, and } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
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
