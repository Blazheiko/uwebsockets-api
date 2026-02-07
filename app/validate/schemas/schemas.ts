import { type } from 'arktype';

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
    validator: ReturnType<typeof type>;
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
        validator: type({
            name: 'string >= 1 & string <= 100',
            email: 'string.email & string <= 255',
            password: 'string >= 8 & string <= 32',
            'token?': 'string <= 60',
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
        validator: type({
            email: 'string.email & string <= 255',
            password: 'string >= 8 & string <= 32',
            'token?': 'string <= 60',
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
        validator: type({
            participantId: 'number.integer > 0',
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
        validator: type({
            chatId: 'number.integer > 0',
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
        validator: type({
            userId: 'number.integer > 0',
            contactId: 'number.integer > 0',
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
        validator: type({
            userId: 'number.integer > 0',
            contactId: 'number.integer > 0',
            content: 'string >= 1 & string <= 10000',
            'type?': "'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO'",
            'src?': 'string',
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
        validator: type({
            userId: 'number.integer > 0',
            messageId: 'number.integer > 0',
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
        validator: type({
            userId: 'number.integer > 0',
            messageId: 'number.integer > 0',
            content: 'string >= 1 & string <= 10000',
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
        validator: type({
            userId: 'number.integer > 0',
            contactId: 'number.integer > 0',
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
        validator: type({
            messageId: 'number.integer > 0',
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
        validator: type({
            userId: 'number.integer > 0',
            name: 'string >= 1 & string <= 100',
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
        validator: type({
            userId: 'number.integer > 0',
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
        validator: type({
            token: 'string >= 1 & string <= 50',
        }),
    },
};

export default schemas;
