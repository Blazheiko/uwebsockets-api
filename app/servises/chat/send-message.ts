import { db } from "#database/db.js";
import { contactList, messages } from "#database/schema.js";
import { eq, and, sql } from "drizzle-orm";
import logger from "#logger";
import broadcastig from "#app/servises/broadcastig.js";

export default async (content: string, userId: string, contactId: string) => {
   if (!contactId || !content || !userId) return null;
               
   // Verify contact exists              
   const contact = await db.select()
       .from(contactList)
       .where(and(
           eq(contactList.userId, BigInt(userId)),
           eq(contactList.contactId, BigInt(contactId))
       ))
       .limit(1);

   if (contact.length === 0) return null;
   
   const now = new Date();
   const [message] = await db.insert(messages).values({
       senderId: BigInt(userId),
       receiverId: BigInt(contactId),
       content,
       type: 'TEXT',
       createdAt: now,
       updatedAt: now,
   });

   const createdMessage = await db.select()
       .from(messages)
       .where(eq(messages.id, BigInt(message.insertId)))
       .limit(1);

   // Update contact's unread count and last message
   await db.update(contactList)
       .set({
           unreadCount: sql`${contactList.unreadCount} + 1`,
           lastMessageId: BigInt(message.insertId),
       })
       .where(and(
        eq(contactList.userId, BigInt(contactId)),
        eq(contactList.contactId, BigInt(userId))
    ));

   const updated = await db.update(contactList)
       .set({
           updatedAt: new Date(),
           lastMessageId: BigInt(message.insertId),
           lastMessageAt: new Date(),
       })
       .where(and(
           eq(contactList.userId, BigInt(userId)),
           eq(contactList.contactId, BigInt(contactId))
       ));

   logger.info(`updated: ${updated}`);

   // broadcastMessage(contactId, 'new_message', { message });
   broadcastig.broadcastMessageToUser(contactId, 'new_message', { message: createdMessage[0] });

   return createdMessage[0];
}
