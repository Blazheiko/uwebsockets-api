import Message from '#app/models/message.js';
import ContactList from '#app/models/contact-list.js';

export default async (userId: bigint, contactId: bigint) => {
    if (!userId || !contactId) return null;

    const result = await Message.readedMessages(userId, contactId);
    console.log(result);
    const result2 = await ContactList.resetUnreadCount(userId, contactId);
    console.log(result2);

};