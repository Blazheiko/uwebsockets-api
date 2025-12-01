import { randomUUID } from 'crypto';
import { db } from '#database/db.js';
import { invitations, users } from '#database/schema.js';
import { eq } from 'drizzle-orm';
import { HttpContext } from '../../../vendor/types/types.js';
import inventionAccept from '#app/servises/invention-accept.js';
import type {
    CreateInvitationResponse,
    GetUserInvitationsResponse,
    UseInvitationResponse,
} from '../types/InvitationController.js';

export default {
    // Create new invitation
    async createInvitation({
        httpData,
        session,
        logger,
    }: HttpContext): Promise<CreateInvitationResponse> {
        logger.info('createInvitation');
        const { userId, name } = httpData.payload;

        const expiresIn = 7; // Invitation validity period in days
        const sessionInfo = session?.sessionInfo;
        const userIdFromSession = sessionInfo?.data?.userId;
        if (
            !userId ||
            !userIdFromSession ||
            +userId !== +userIdFromSession ||
            !name
        ) {
            logger.error('User ID is required');
            return { status: 'error', message: 'User ID is required' };
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);

        const now = new Date();
        const [invitation] = await db.insert(invitations).values({
            name: name,
            token: Buffer.from(randomUUID()).toString('base64'),
            userId: BigInt(userId),
            expiresAt,
            createdAt: now,
            updatedAt: now,
        });

        const createdInvitation = await db.select()
            .from(invitations)
            .where(eq(invitations.id, BigInt(invitation.insertId)))
            .limit(1);

        return {
            status: 'success',
            message: 'Invitation created successfully',
            token: createdInvitation[0].token,
        };
    },

    // Get all user invitations
    async getUserInvitations({
        httpData,
        responseData,
        logger,
    }: HttpContext): Promise<GetUserInvitationsResponse> {
        logger.info('getUserInvitations');

        const { userId } = httpData.payload;

        if (!userId) {
            responseData.status = 400;
            return { status: 'error', message: 'User ID is required' };
        }

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
            .where(eq(invitations.userId, BigInt(userId)));

        return { status: 'success', invitations: invitationsData };
    },

    // Check and use invitation
    async useInvitation({
        httpData,
        responseData,
        logger,
        session,
    }: HttpContext): Promise<UseInvitationResponse> {
        logger.info('useInvitation');

        const { token } = httpData.payload;

        logger.info(token);

        if (!token) {
            responseData.status = 400;
            return { status: 'error', message: 'Token are required' };
        }

        const sessionInfo = session?.sessionInfo;
        if (sessionInfo) {
            const userId = sessionInfo.data?.userId;
            if (userId) {
                await inventionAccept(token, Number(userId));
                logger.info('inventionAccept');
                return { status: 'success' };
            }
        }

        return { status: 'awaiting' };
    },
};
