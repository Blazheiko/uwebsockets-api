import Message from '#app/models/message.js';
import ContactList from '#app/models/contact-list.js';

export default async (userId: bigint, contactId: bigint) => {
    if (!userId || !contactId) return null;

    await Message.readedMessages(userId, contactId);
    await ContactList.resetUnreadCount(userId, contactId);
    

};