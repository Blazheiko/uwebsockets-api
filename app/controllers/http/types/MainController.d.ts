/**
 * Response types for MainController
 */

export interface PingResponse {
    status: 'ok';
}

export interface InitResponse {
    status: 'ok' | 'error' | 'unauthorized';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    wsUrl?: string;
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
