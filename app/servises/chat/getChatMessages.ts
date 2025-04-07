import { prisma } from "#database/prisma.js";
import { getOnlineUser } from "#vendor/utils/wsHandler.js";
import { Message } from "@prisma/client";
import { ContactList } from "@prisma/client";

export default async (userId: number, contactId: number): Promise<{ messages: Message[], contact: ContactList, onlineUsers: number[] } | null> => {
    if (!userId || !contactId) return null;
    
    const contact = await prisma.contactList.findFirst({
        where: {
            userId: userId,
            contactId: contactId
        },
        include: {
            contact: true
        }
    });
    if (!contact) return null;
    if (contact.unreadCount > 0) {
        await prisma.contactList.update({
            where: {
                userId_contactId: {
                    userId: userId,
                    contactId: contactId
                }
            },
            data: {
                unreadCount: 0
            }
        });
        contact.unreadCount = 0;
    }
    const messages = await prisma.message.findMany({ 
        where: {
            OR: [
                {
                    AND: [
                        { senderId: userId },
                        { receiverId: contactId }
                    ]
                },
                {
                    AND: [
                        { senderId: contactId },
                        { receiverId: userId }
                    ]
                }
                ]
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    });

    const onlineUsers = getOnlineUser([contact.contactId]);

    return { messages, contact: contact as ContactList , onlineUsers };
}