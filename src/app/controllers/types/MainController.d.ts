/**
 * Input types for MainController
 */

export interface SaveUserInput {
    name: string;
    email: string;
    password: string;
}

/**
 * Response types for MainController
 */

export interface PingResponse {
    status: string;
}

export interface InitResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: string; // User not found
    user?: {
        id: number; // 1
        name: string; // John Doe
        email: string; // john.doe@example.com
        createdAt: string; // 2025-09-28T06:56:22.000Z
        updatedAt: string; // 2025-09-28T06:56:22.000Z
    };
    wsUrl?: string; // ws://127.0.0.1:8088/websocket/PWdWMkn2aHRecaS7
}

export interface TestRouteResponse {
    status: string;
}

export interface TestHeadersResponse {
    status: string;
    headers: { key: string; value: string }[];
    params: any[];
}

export interface GetSetCookiesResponse {
    status: string;
    cookies: { key: string; value: string }[];
}

export interface TestSessionResponse {
    status: string;
    cookies: { key: string; value: string }[];
    sessionInfo: any;
}

export interface SaveUserResponse {
    status: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

export interface TestApiSessionResponse {
    status: string;
    headers: { key: string; value: string }[];
    sessionInfo: any;
}

export interface IndexResponse {
    payload: any;
    responseData: any;
}

export interface TestParamsResponse {
    params: any;
    query: string[];
    status: string;
}

export interface SetHeaderAndCookieResponse {
    status: string;
}

export interface TestMiddlewareResponse {
    middlewares: string[];
    status: string;
}

export interface UpdateWsTokenResponse {
    status: string;
    message?: string;
    wsUrl?: string;
}