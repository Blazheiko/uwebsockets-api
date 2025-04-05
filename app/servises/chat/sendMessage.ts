import { prisma } from "#database/prisma.js";

export default async (content: string, userId: number, contactId: number) => {
   if (!contactId || !content || !userId) return null;
               
   // Verify contact exists              
   const contact = await prisma.contactList.findFirst({where: { userId: contactId , contactId: userId }});
   if (!contact) return null;
   
   const message = await prisma.message.create({
               data: {
                senderId: userId,
                receiverId: contactId,
                content,
                type: 'TEXT'
            },
        });

        // Update contact's unread count
    await prisma.contactList.update({
        where: { id: contact.id },
        data: {
               unreadCount: {
               increment: 1
               },
               updatedAt: new Date()
        }
    });

    return message;
}