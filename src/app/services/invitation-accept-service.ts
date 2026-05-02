import { db } from '#database/db.js';
import { invitations, contactList } from '#database/schema.js';
import { eq, and } from 'drizzle-orm';
import { isCanonicalEntityId } from '#vendor/utils/helpers/entity-id.js';

export async function acceptInvitation(token: string, userId: string): Promise<void> {
    if (token === '' || !isCanonicalEntityId(userId)) return;
    const userIdBigInt = BigInt(userId);

    const invitation = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.token, token), eq(invitations.isUsed, false)))
        .limit(1);

    const invitationItem = invitation.at(0);
    if (invitationItem === undefined || invitationItem.invitedId === userIdBigInt) return;

    await db
        .update(invitations)
        .set({
            isUsed: true,
            invitedId: userIdBigInt,
        })
        .where(eq(invitations.id, invitationItem.id));

    const contact = await db
        .select({ id: contactList.id })
        .from(contactList)
        .where(
            and(
                eq(contactList.userId, userIdBigInt),
                eq(contactList.contactId, invitationItem.userId),
            ),
        )
        .limit(1);

    const now = new Date();
    if (contact.length === 0) {
        await db.insert(contactList).values({
            userId: userIdBigInt,
            contactId: invitationItem.userId,
            status: 'accepted',
            rename: null,
            createdAt: now,
            updatedAt: now,
        });
    }

    const contactOwner = await db
        .select({ id: contactList.id })
        .from(contactList)
        .where(
            and(
                eq(contactList.userId, invitationItem.userId),
                eq(contactList.contactId, userIdBigInt),
            ),
        )
        .limit(1);

    if (contactOwner.length === 0) {
        await db.insert(contactList).values({
            userId: invitationItem.userId,
            contactId: userIdBigInt,
            status: 'accepted',
            rename: invitationItem.name,
            createdAt: now,
            updatedAt: now,
        });
    }
}
