import { prisma } from "#database/prisma.js";
import logger from "#logger";
import broadcastig from "#app/servises/broadcastig.js";

export default async (content: string, userId: string, contactId: string) => {
   if (!contactId || !content || !userId) return null;
               
   // Verify contact exists              
   const contact = await prisma.contactList.findFirst({where: { userId: Number(userId), contactId: Number(contactId) }});
   if (!contact) return null;
   
   const message = await prisma.message.create({
               data: {
                senderId: Number(userId),
                receiverId: Number(contactId),
                content,
                type: 'TEXT'
            },
        });

        // Update contact's unread count
    await prisma.contactList.update({
        where: { id: contact.id },
        data: {
            unreadCount: { increment: 1 },
            lastMessageId: message.id
        }
    });
    const updated = await prisma.contactList.update({
        where: { userId_contactId: { userId: Number(userId), contactId: Number(contactId) } },
        data: {
            updatedAt: new Date(),
            lastMessageId: message.id
        }
    });
    logger.info(`updated: ${updated}`);

    // broadcastMessage(contactId, 'new_message', { message });
    broadcastig.broadcastMessageToUser(contactId, 'new_message', { message });

    return message;
}
