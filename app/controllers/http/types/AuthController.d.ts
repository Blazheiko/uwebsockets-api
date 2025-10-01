/**
 * Response types for AuthController
 */

export interface RegisterResponse {
    status: 'ok' | 'error';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface LoginResponse {
    status: 'ok' | 'error';
    message?: string;
    token?: string;
}

export interface LogoutResponse {
    status: 'ok';
    message: string;
}
