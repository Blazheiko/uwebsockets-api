/**
 * Response types for Chat Controllers (ChatList & Message)
 */

export interface User {
    id: bigint;
    name: string;
    email: string;
    password: string;
    phone: string | null;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Contact {
    id: bigint;
    userId: bigint;
    contactId: bigint;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    contact: {
        id: bigint;
        name: string;
    } | null;
    lastMessage?: {
        id: bigint;
        content: string;
        senderId: bigint;
        receiverId: bigint;
        createdAt: Date;
        updatedAt: Date;
        type: any;
        src: string | null;
        isRead: boolean;
        calendarId: bigint | null;
        taskId: bigint | null;
    } | null;
}

export interface GetContactListResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | string | null;
    contactList?: Contact[] | null;
    onlineUsers?: string[];
}

export interface ContactList {
    id: bigint;
    userId: bigint;
    contactId: bigint;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    contact: User;
}

export interface CreateChatResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | string | null;
    chat?: ContactList | null;
}

export interface DeleteChatResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | string | null;
}

export interface Message {
    id: bigint;
    content: string;
    senderId: bigint;
    receiverId: bigint;
    createdAt: Date;
    updatedAt: Date;
    isRead: boolean;
    type: any;
    src: string | null;
    calendarId: bigint | null;
    taskId: bigint | null;
}

export interface GetMessagesResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: string;
    messages?: Message[];
    contact?: any;
    onlineUsers?: string[];
}

export interface SendMessageResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | null | string;
}

export interface DeleteMessageResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | string | null;
}

export interface EditMessageResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | null | string;
}

export interface MarkAsReadResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: Message | string | null;
}
