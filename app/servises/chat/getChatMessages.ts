import { prisma } from "#database/prisma.js";
import { Message } from "@prisma/client";
import { ContactList } from "@prisma/client";

export default async (userId: number, contactId: number): Promise<{ messages: Message[], contact: ContactList } | null> => {
    if (!userId || !contactId) return null;
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
    const contact = await prisma.contactList.findFirst({
        where: {
            userId: userId,
            contactId: contactId
        }
    });
    
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
    return { messages, contact: contact as ContactList };
}