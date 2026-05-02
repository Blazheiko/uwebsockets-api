import { db } from '#database/db.js';
import { invitations, users } from '#database/schema.js';
import { eq } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type InvitationRow = InferSelectModel<typeof invitations>;
export type InvitationInsert = InferInsertModel<typeof invitations>;
export type InvitationUpdate = Partial<
    Pick<InvitationInsert, 'isUsed' | 'invitedId' | 'expiresAt' | 'name'>
>;

export type InvitedUserSummary = {
    id: bigint;
    name: string;
    email: string;
} | null;

export type InvitationWithInvited = Omit<InvitationRow, never> & {
    invited: InvitedUserSummary;
};

export interface IInvitationRepository {
    create(data: InvitationInsert): Promise<InvitationRow>;
    findById(id: bigint): Promise<InvitationRow | undefined>;
    findByToken(token: string): Promise<InvitationRow | undefined>;
    findByUserId(userId: bigint): Promise<InvitationWithInvited[]>;
    update(id: bigint, data: InvitationUpdate): Promise<InvitationRow | undefined>;
    markAsUsed(token: string, invitedId: bigint): Promise<InvitationRow | undefined>;
    delete(id: bigint): Promise<boolean>;
}

export const invitationRepository: IInvitationRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(invitations).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create invitation');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(invitations)
            .where(eq(invitations.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByToken(token) {
        return await db
            .select()
            .from(invitations)
            .where(eq(invitations.token, token))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByUserId(userId) {
        return await db
            .select({
                id: invitations.id,
                token: invitations.token,
                userId: invitations.userId,
                invitedId: invitations.invitedId,
                isUsed: invitations.isUsed,
                expiresAt: invitations.expiresAt,
                createdAt: invitations.createdAt,
                updatedAt: invitations.updatedAt,
                name: invitations.name,
                invited: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                },
            })
            .from(invitations)
            .leftJoin(users, eq(invitations.invitedId, users.id))
            .where(eq(invitations.userId, userId));
    },

    async update(id, data) {
        await db
            .update(invitations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(invitations.id, id));
        return invitationRepository.findById(id);
    },

    async markAsUsed(token, invitedId) {
        await db
            .update(invitations)
            .set({ isUsed: true, invitedId, updatedAt: new Date() })
            .where(eq(invitations.token, token));
        return invitationRepository.findByToken(token);
    },

    async delete(id) {
        const deleted = await db.delete(invitations).where(eq(invitations.id, id)).returning();
        return deleted.length > 0;
    },
};
