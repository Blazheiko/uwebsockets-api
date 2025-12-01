import { db } from '#database/db.js';
import { invitations, contactList } from '#database/schema.js';
import { eq, and } from 'drizzle-orm';
import ContactList from '../models/contact-list.js';
import logger from '../../logger.js';

export default async (token: string, userId: number) => {
    console.log('inventionAccept');
    if (!token || !userId) return;

    const invention = await db.select()
        .from(invitations)
        .where(and(eq(invitations.token, token), eq(invitations.isUsed, false)))
        .limit(1);

    if (invention.length === 0 || Number(invention[0].invitedId) === userId) return;

    await db.update(invitations)
        .set({
            isUsed: true,
            invitedId: BigInt(userId)
        })
        .where(eq(invitations.id, invention[0].id));

    const contact = await db.select({ id: contactList.id })
        .from(contactList)
        .where(and(
            eq(contactList.userId, BigInt(userId)),
            eq(contactList.contactId, invention[0].userId)
        ))
        .limit(1);

    const now = new Date();
    if (contact.length === 0) {
        await db.insert(contactList).values({
            userId: BigInt(userId),
            contactId: invention[0].userId,
            status: 'accepted',
            rename: null,
            createdAt: now,
            updatedAt: now,
        });
    }

    const contactOwner = await db.select({ id: contactList.id })
        .from(contactList)
        .where(and(
            eq(contactList.userId, invention[0].userId),
            eq(contactList.contactId, BigInt(userId))
        ))
        .limit(1);

    if (contactOwner.length === 0) {
        await db.insert(contactList).values({
            userId: invention[0].userId,
            contactId: BigInt(userId),
            status: 'accepted',
            rename: invention[0].name,
            createdAt: now,
            updatedAt: now,
        });
    }
}
