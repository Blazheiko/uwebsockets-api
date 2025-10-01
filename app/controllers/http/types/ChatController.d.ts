/**
 * Response types for Chat Controllers (ChatList & Message)
 */

export interface GetContactListResponse {
    status: 'ok';
    contacts: Array<{
        id: number;
        name: string;
        lastMessage?: string;
        unreadCount?: number;
    }>;
}

export interface CreateChatResponse {
    status: 'ok' | 'error';
    message?: string;
    chatId?: number;
}

export interface DeleteChatResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface GetMessagesResponse {
    status: 'ok';
    messages: Array<{
        id: number;
        text: string;
        senderId: number;
        createdAt: string;
        isRead: boolean;
    }>;
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface SendMessageResponse {
    status: 'ok' | 'error';
    message?: string;
    messageId?: number;
}

export interface DeleteMessageResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface EditMessageResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface MarkAsReadResponse {
    status: 'ok' | 'error';
    message?: string;
}
