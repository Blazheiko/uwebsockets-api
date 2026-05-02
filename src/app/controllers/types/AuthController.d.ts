/**
 * Input types for AuthController
 */

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    token?: string;
}

export interface LoginInput {
    email: string;
    password: string;
    token?: string;
}

/**
 * Response types for AuthController
 */

export interface RegisterResponse {
    status: 'success' | 'error';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    wsUrl?: string;
}

export interface LoginResponse {
    status: 'success' | 'error';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    wsUrl?: string;
}

export interface LogoutResponse {
    status: 'success' | 'error';
    message?: string;
    deletedCount?: number;
}
