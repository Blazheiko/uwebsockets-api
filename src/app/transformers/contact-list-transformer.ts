import { DateTime } from 'luxon';
import type { ContactListRow, ContactListWithDetails } from '#app/repositories/contact-list-repository.js';

export type SerializedContactList = Omit<
    ContactListRow,
    'id' | 'userId' | 'contactId' | 'lastMessageId' | 'createdAt' | 'updatedAt' | 'lastMessageAt'
> & {
    id: string;
    userId: string;
    contactId: string;
    lastMessageId: string | null;
    created_at: string | null;
    updated_at: string | null;
    last_message_at: string | null;
};

export type SerializedContactListWithDetails = Omit<
    ContactListWithDetails,
    'id' | 'userId' | 'contactId' | 'lastMessageId' | 'createdAt' | 'updatedAt' | 'lastMessageAt'
> & {
    id: string;
    userId: string;
    contactId: string;
    lastMessageId: string | null;
    created_at: string | null;
    updated_at: string | null;
    last_message_at: string | null;
};

export const contactListTransformer = {
    serialize(contact: ContactListRow): SerializedContactList {
        const { createdAt, updatedAt, lastMessageAt, id, userId, contactId, lastMessageId, ...rest } = contact;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            contactId: String(contactId),
            lastMessageId: lastMessageId !== null ? String(lastMessageId) : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            last_message_at: DateTime.fromJSDate(lastMessageAt).toISO(),
        };
    },

    serializeWithDetails(contact: ContactListWithDetails): SerializedContactListWithDetails {
        const { createdAt, updatedAt, lastMessageAt, id, userId, contactId, lastMessageId, ...rest } = contact;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            contactId: String(contactId),
            lastMessageId: lastMessageId !== null ? String(lastMessageId) : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            last_message_at: DateTime.fromJSDate(lastMessageAt).toISO(),
        };
    },

    serializeArray(contacts: ContactListRow[]): SerializedContactList[] {
        return contacts.map((c) => contactListTransformer.serialize(c));
    },

    serializeArrayWithDetails(contacts: ContactListWithDetails[]): SerializedContactListWithDetails[] {
        return contacts.map((c) => contactListTransformer.serializeWithDetails(c));
    },
};
