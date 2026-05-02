/**
 * Input types for InvitationController
 */

export interface CreateInvitationInput {
    userId: number;
    name: string;
}

export interface GetUserInvitationsInput {
    userId: number;
}

export interface UseInvitationInput {
    token: string;
}

/**
 * Response types for InvitationController
 */

export interface CreateInvitationResponse {
    status: 'success' | 'error';
    message?: string;
    token?: string;
}

export interface GetUserInvitationsResponse {
    status: 'success' | 'error';
    message?: string;
    invitations?: any[];
}

export interface UseInvitationResponse {
    status: 'success' | 'error' | 'awaiting';
    message?: string;
}
