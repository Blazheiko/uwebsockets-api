import { db } from '#database/db.js';
import { invitations, users } from '#database/schema.js';
import { eq, and } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    expiresAt: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['token', 'userId', 'name', 'expiresAt'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create invitation');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const now = new Date();
        const [invitation] = await db.insert(invitations).values({
            token: payload.token,
            userId: BigInt(payload.userId),
            name: payload.name,
            expiresAt: new Date(payload.expiresAt),
            invitedId: payload.invitedId ? BigInt(payload.invitedId) : null,
            isUsed: payload.isUsed || false,
            createdAt: now,
            updatedAt: now,
        });

        const createdInvitation = await db.select()
            .from(invitations)
            .where(eq(invitations.id, BigInt(invitation.insertId)))
            .limit(1);

        return serializeModel(createdInvitation[0], schema, hidden);
    },

    async findById(id: bigint) {
        logger.info(`find invitation by id: ${id}`);

        const invitation = await db.select()
            .from(invitations)
            .where(eq(invitations.id, id))
            .limit(1);

        if (invitation.length === 0) {
            throw new Error(`Invitation with id ${id} not found`);
        }

        return serializeModel(invitation[0], schema, hidden);
    },

    async findByToken(token: string) {
        logger.info(`find invitation by token`);

        const invitation = await db.select()
            .from(invitations)
            .where(eq(invitations.token, token))
            .limit(1);

        if (invitation.length === 0) {
            throw new Error(`Invitation with token not found`);
        }

        return serializeModel(invitation[0], schema, hidden);
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all invitations for user: ${userId}`);

        const invitationsData = await db.select({
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

        return invitationsData;
    },

    async update(id: bigint, payload: any) {
        logger.info(`update invitation id: ${id}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.isUsed !== undefined) updateData.isUsed = payload.isUsed;
        if (payload.invitedId !== undefined) updateData.invitedId = payload.invitedId ? BigInt(payload.invitedId) : null;
        if (payload.expiresAt !== undefined) updateData.expiresAt = new Date(payload.expiresAt);
        if (payload.name !== undefined) updateData.name = payload.name;

        await db.update(invitations)
            .set(updateData)
            .where(eq(invitations.id, id));

        const updatedInvitation = await db.select()
            .from(invitations)
            .where(eq(invitations.id, id))
            .limit(1);

        if (updatedInvitation.length === 0) {
            throw new Error('Invitation not found');
        }

        return serializeModel(updatedInvitation[0], schema, hidden);
    },

    async markAsUsed(token: string, invitedId: bigint) {
        logger.info(`mark invitation as used for token`);

        await db.update(invitations)
            .set({
                isUsed: true,
                invitedId: invitedId,
                updatedAt: new Date(),
            })
            .where(eq(invitations.token, token));

        const updatedInvitation = await db.select()
            .from(invitations)
            .where(eq(invitations.token, token))
            .limit(1);

        if (updatedInvitation.length === 0) {
            throw new Error('Invitation not found');
        }

        return serializeModel(updatedInvitation[0], schema, hidden);
    },

    async delete(id: bigint) {
        logger.info(`delete invitation id: ${id}`);

        const result = await db.delete(invitations)
            .where(eq(invitations.id, id));

        return result;
    },

    query() {
        return db.select().from(invitations);
    },

    serialize(invitation: any) {
        return serializeModel(invitation, schema, hidden);
    },

    serializeArray(invitationsData: any) {
        return invitationsData.map((invitation: any) =>
            serializeModel(invitation, schema, hidden),
        );
    },
};

