import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/model.js';
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
        const existingContact = await prisma.contactList.findUnique({
            where: {
                userId_contactId: {
                    userId: payload.userId,
                    contactId: payload.contactId
                }
            }
        });

        if (existingContact) {
            throw new Error('Contact already exists in contact list');
        }
        let contact = null;

        try {
            contact = await prisma.contactList.create({
                data: {
                    userId: payload.userId,
                    contactId: payload.contactId,
                    status: payload.status || 'pending',
                    rename: payload.rename || null,
                },
                include: {
                    user: false,
                    contact: true
                }
            });
        }catch (e) {
            logger.error(e);
            throw new Error('Error creating contact');
        }

        return serializeModel(contact, schema, hidden);
    },

    async findById(id: number) {
        const contact = await prisma.contactList.findUnique({
            where: { id },
            include: {
                user: true,
                contact: true
            }
        });
        
        if (!contact) {
            throw new Error(`Contact list entry with id ${id} not found`);
        }
        
        return serializeModel(contact, schema, hidden);
    },

    async update(id: number, payload: any) {
        const updateData = {
            ...payload,
            updatedAt: DateTime.now().toISO(),
        };

        const contact = await prisma.contactList.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
                contact: true
            }
        });
        return serializeModel(contact, schema, hidden);
    },

    async delete(id: number) {
        const result = await prisma.contactList.delete({
            where: { id }
        });
        return result;
    },

    async findByUserId(userId: number) {
        const contacts = await prisma.contactList.findMany({
            where: { userId },
            include: {
                contact: true
            }
        });
        return this.serializeArray(contacts);
    },

    query() {
        return prisma.contactList;
    },

    serialize(contact: any) {
        return serializeModel(contact, schema, hidden);
    },

    serializeArray(contacts: any) {
        return contacts.map((contact: any) => serializeModel(contact, schema, hidden));
    },
}; 