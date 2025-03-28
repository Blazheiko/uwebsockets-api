import vine from '@vinejs/vine';

const schemas: Record<string, any> = {
    register: vine.object({
        name: vine.string().minLength(1).maxLength(100),
        email: vine.string().email().minLength(1).maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),
    login: vine.object({
        email: vine.string().email().maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),

    // Chat List schemas
    createChat: vine.object({
        participantId: vine.number().positive(),
    }),
    deleteChat: vine.object({
        chatId: vine.number().positive(),
    }),

    // Message schemas
    getMessages: vine.object({
        contactId: vine.number().positive(),
    }),
    sendMessage: vine.object({
        contactId: vine.number().positive(),
        content: vine.string().minLength(1).maxLength(10000),
        type: vine.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']).optional(),
        src: vine.string().optional(),
    }),
    deleteMessage: vine.object({
        messageId: vine.number().positive(),
    }),
    editMessage: vine.object({
        messageId: vine.number().positive(),
        content: vine.string().minLength(1).maxLength(10000),
    }),
    markMessageAsRead: vine.object({
        messageId: vine.number().positive(),
    }),
    createInvitation: vine.object({
        userId: vine.number().positive(),
    }),
    getUserInvitations: vine.object({
        userId: vine.number().positive(),
    }),
    useInvitation: vine.object({
        token: vine.string().minLength(1).maxLength(40),
    }),
};

export default schemas;
