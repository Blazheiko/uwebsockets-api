/**
 * Response types for MainController
 */

export interface PingResponse {
    status: 'ok';
}

export interface InitResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: string;// User not found
    user?: {
        id: number;
        name: string;
        email: string;
    };
    wsUrl?: string; // ws://127.0.0.1:8088/websocket/PWdWMkn2aHRecaS7
}

export interface TestHeadersResponse {
    status: 'ok';
    headers: Array<{ key: string; value: string }>;
    params: any[];
}

export interface GetSetCookiesResponse {
    status: 'ok';
    cookies: Array<{ key: string; value: string }>;
}

export interface TestSessionResponse {
    status: 'ok';
    cookies: Array<{ key: string; value: string }>;
    sessionInfo: any;
}

export interface SaveUserResponse {
    status: 'ok';
    user: {
        id: number;
        name: string;
        email: string;
    };
}
