import { DateTime } from 'luxon';
import type { InvitationRow, InvitationWithInvited } from '#app/repositories/invitation-repository.js';

export type SerializedInvitation = Omit<InvitationRow, 'id' | 'userId' | 'invitedId' | 'createdAt' | 'updatedAt' | 'expiresAt'> & {
    id: string;
    userId: string;
    invitedId: string | null;
    created_at: string | null;
    updated_at: string | null;
    expiresAt: string | null;
};

export type SerializedInvitationWithInvited = Omit<
    InvitationWithInvited,
    'id' | 'userId' | 'invitedId' | 'createdAt' | 'updatedAt' | 'expiresAt'
> & {
    id: string;
    userId: string;
    invitedId: string | null;
    created_at: string | null;
    updated_at: string | null;
    expiresAt: string | null;
};

export const invitationTransformer = {
    serialize(invitation: InvitationRow): SerializedInvitation {
        const { createdAt, updatedAt, expiresAt, id, userId, invitedId, ...rest } = invitation;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            invitedId: invitedId !== null ? String(invitedId) : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            expiresAt: DateTime.fromJSDate(expiresAt).toISO(),
        };
    },

    serializeWithInvited(invitation: InvitationWithInvited): SerializedInvitationWithInvited {
        const { createdAt, updatedAt, expiresAt, id, userId, invitedId, ...rest } = invitation;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            invitedId: invitedId !== null ? String(invitedId) : null,
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            expiresAt: DateTime.fromJSDate(expiresAt).toISO(),
        };
    },

    serializeArray(invitations: InvitationRow[]): SerializedInvitation[] {
        return invitations.map((i) => invitationTransformer.serialize(i));
    },

    serializeArrayWithInvited(
        invitations: InvitationWithInvited[],
    ): SerializedInvitationWithInvited[] {
        return invitations.map((i) => invitationTransformer.serializeWithInvited(i));
    },
};
