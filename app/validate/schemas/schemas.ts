import vine from '@vinejs/vine';

interface FieldDoc {
    description: string;
    type: 'string' | 'number';
    required: boolean;
}

interface SchemaDoc {
    [fieldName: string]: FieldDoc;
}

interface Schema {
    doc: SchemaDoc;
    validator: ReturnType<typeof vine.object>;
}

const schemas: Record<string, Schema> = {
    register: {
        doc: {
            name: {
                description: 'User name, 1-100 characters',
                type: 'string',
                required: true,
            },
            email: {
                description: 'Valid email address, max 255 characters',
                type: 'string',
                required: true,
            },
            password: {
                description: 'Password, 8-32 characters',
                type: 'string',
                required: true,
            },
            token: {
                description: 'Optional invitation token, max 60 characters',
                type: 'string',
                required: false,
            },
        },
        validator: vine.object({
            name: vine.string().minLength(1).maxLength(100),
            email: vine.string().email().minLength(1).maxLength(255),
            password: vine.string().minLength(8).maxLength(32),
            token: vine.string().maxLength(60).optional(),
        }),
    },
    login: {
        doc: {
            email: {
                description: 'Valid email address, max 255 characters',
                type: 'string',
                required: true,
            },
            password: {
                description: 'Password, 8-32 characters',
                type: 'string',
                required: true,
            },
            token: {
                description: 'Optional token, max 60 characters',
                type: 'string',
                required: false,
            },
        },
        validator: vine.object({
            email: vine.string().email().maxLength(255),
            password: vine.string().minLength(8).maxLength(32),
            token: vine.string().maxLength(60).optional(),
        }),
    },

    // Chat List schemas
    createChat: {
        doc: {
            participantId: {
                description: 'Positive integer ID of participant',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            participantId: vine.number().positive(),
        }),
    },
    deleteChat: {
        doc: {
            chatId: {
                description: 'Positive integer ID of chat to delete',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            chatId: vine.number().positive(),
        }),
    },

    // Message schemas
    getMessages: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            contactId: {
                description: 'Positive integer ID of contact',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            contactId: vine.number().positive(),
        }),
    },
    sendMessage: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            contactId: {
                description: 'Positive integer ID of contact',
                type: 'number',
                required: true,
            },
            content: {
                description: 'Message content, 1-10000 characters',
                type: 'string',
                required: true,
            },
            type: {
                description: 'Optional message type: TEXT, IMAGE, VIDEO, AUDIO',
                type: 'string',
                required: false,
            },
            src: {
                description: 'Optional source URL',
                type: 'string',
                required: false,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            contactId: vine.number().positive(),
            content: vine.string().minLength(1).maxLength(10000),
            type: vine.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']).optional(),
            src: vine.string().optional(),
        }),
    },
    deleteMessage: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            messageId: {
                description: 'Positive integer ID of message',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            messageId: vine.number().positive(),
        }),
    },
    editMessage: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            messageId: {
                description: 'Positive integer ID of message',
                type: 'number',
                required: true,
            },
            content: {
                description: 'Updated message content, 1-10000 characters',
                type: 'string',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            messageId: vine.number().positive(),
            content: vine.string().minLength(1).maxLength(10000),
        }),
    },
    readMessages: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            contactId: {
                description: 'Positive integer ID user of contact',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            contactId: vine.number().positive(),
        }),
    },
    markMessageAsRead: {
        doc: {
            messageId: {
                description: 'Positive integer ID of message',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            messageId: vine.number().positive(),
        }),
    },
    createInvitation: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
            name: {
                description: 'Invitation name, 1-100 characters',
                type: 'string',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
            name: vine.string().minLength(1).maxLength(100),
        }),
    },
    getUserInvitations: {
        doc: {
            userId: {
                description: 'Positive integer ID of user',
                type: 'number',
                required: true,
            },
        },
        validator: vine.object({
            userId: vine.number().positive(),
        }),
    },
    useInvitation: {
        doc: {
            token: {
                description: 'Invitation token, 1-50 characters',
                type: 'string',
                required: true,
            },
        },
        validator: vine.object({
            token: vine.string().minLength(1).maxLength(50),
        }),
    },
};

export default schemas;
