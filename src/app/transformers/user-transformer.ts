import { DateTime } from 'luxon';
import type { UserRow } from '#app/repositories/user-repository.js';

export type SerializedUser = Omit<UserRow, 'id' | 'password' | 'isAdmin' | 'createdAt' | 'updatedAt' | 'emailVerifiedAt'> & {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
};

export const userTransformer = {
    serialize(user: UserRow): SerializedUser {
        const { id, password: _password, isAdmin: _isAdmin, createdAt, updatedAt, emailVerifiedAt, ...rest } = user;
        return {
            ...rest,
            id: String(id),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            emailVerified: emailVerifiedAt !== null,
            emailVerifiedAt: emailVerifiedAt === null ? null : DateTime.fromJSDate(emailVerifiedAt).toISO(),
        };
    },

    serializeArray(usersData: UserRow[]): SerializedUser[] {
        return usersData.map((u) => userTransformer.serialize(u));
    },
};
