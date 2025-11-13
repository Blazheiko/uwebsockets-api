import { prisma } from '#database/prisma.js';
import { getOnlineUser } from '#vendor/utils/network/ws-handlers.js';

type Message = Awaited<ReturnType<typeof prisma.message.findMany>>[0];
type ContactListWithContact = Awaited<
    ReturnType<
        typeof prisma.contactList.findFirst<{ include: { contact: true } }>
    >
>;

export default async (
    userId: bigint,
    contactId: bigint,
): Promise<{
    messages: Message[];
    contact: NonNullable<ContactListWithContact>;
    onlineUsers: string[];
} | null> => {
    if (!userId || !contactId) return null;

    const contact = await prisma.contactList.findFirst({
        where: {
            userId: userId,
            contactId: contactId,
        },
        include: {
            contact: true,
        },
    });
    if (!contact) return null;
    if (contact.unreadCount > 0) {
        await prisma.contactList.update({
            where: {
                userId_contactId: {
                    userId: userId,
                    contactId: contactId,
                },
            },
            data: {
                unreadCount: 0,
            },
        });
        contact.unreadCount = 0;
    }
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                {
                    AND: [{ senderId: userId }, { receiverId: contactId }],
                },
                {
                    AND: [{ senderId: contactId }, { receiverId: userId }],
                },
            ],
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 50,
    });

    const onlineUsers = getOnlineUser([String(contact.contactId)]);

    return { messages, contact, onlineUsers };
};
