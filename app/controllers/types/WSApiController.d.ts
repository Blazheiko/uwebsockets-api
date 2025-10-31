/**
 * Response types for WSApiController
 */

export interface EventTypingResponse {
    status: 'ok';
}

export interface ErrorResponse {
    status: 'error';
    message?: string;
}

export interface TestWsResponse {
    status: 'ok';
    message: string;
}

export interface SaveUserResponse {
    status: 'ok';
    user: {
        id: number;
        name: string;
        email: string;
        password: string;
    };
}

// Payload interfaces for WebSocket events
export interface EventTypingPayload {
    contactId: string;
    [key: string]: any;
}

export interface SaveUserPayload {
    name: string;
    email: string;
    password: string;
}
