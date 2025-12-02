import { db } from '#database/db.js';
import { messages, contactList, users } from '#database/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { getOnlineUser } from '#vendor/utils/network/ws-handlers.js';
import ContactList from '#app/models/contact-list.js';
import readMessages from '#app/servises/chat/read-messages.js';

type Message = typeof messages.$inferSelect;
type ContactListWithContact = typeof contactList.$inferSelect & { contact: any };

export default async (
    userId: bigint,
    contactId: bigint,
): Promise<{
    messages: Message[];
    contact: NonNullable<ContactListWithContact>;
    onlineUsers: string[];
} | null> => {
    if (!userId || !contactId) return null;
    await readMessages(userId, contactId);

    const contactData = await db.select()
        .from(contactList)
        .leftJoin(users, eq(contactList.contactId, users.id))
        .where(and(
            eq(contactList.userId, userId),
            eq(contactList.contactId, contactId)
        ))
        .limit(1);

    if (contactData.length === 0) return null;

    const contact = {
        ...contactData[0].contact_list,
        contact: contactData[0].users,
    };

    if (contact.unreadCount > 0) {
        // await db.update(contactList)
        //     .set({ unreadCount: 0 })
        //     .where(and(
        //         eq(contactList.userId, userId),
        //         eq(contactList.contactId, contactId)
        //     ));
        
        // await ContactList.resetUnreadCount(userId, contactId);
        
        contact.unreadCount = 0;
    }

    const messagesData = await db.select()
        .from(messages)
        .where(or(
            and(eq(messages.senderId, userId), eq(messages.receiverId, contactId)),
            and(eq(messages.senderId, contactId), eq(messages.receiverId, userId))
        ))
        .orderBy(desc(messages.createdAt))
        .limit(50);

    const onlineUsers = getOnlineUser([String(contact.contactId)]);

    return { messages: messagesData, contact, onlineUsers };
};
