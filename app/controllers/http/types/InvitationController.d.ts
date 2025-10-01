/**
 * Response types for InvitationController
 */

export interface CreateInvitationResponse {
    status: 'ok' | 'error';
    message?: string;
    invitation?: {
        id: number;
        token: string;
        createdAt: string;
    };
}

export interface GetUserInvitationsResponse {
    status: 'ok';
    invitations: Array<{
        id: number;
        token: string;
        createdAt: string;
        expiresAt?: string;
    }>;
}

export interface UseInvitationResponse {
    status: 'ok' | 'error';
    message?: string;
}
