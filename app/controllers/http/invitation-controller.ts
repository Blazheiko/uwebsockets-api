import { randomUUID } from 'crypto';
import { HttpContext } from '../../../vendor/types/types.js';
import inventionAccept from '#app/servises/invention-accept.js';
import Invitation from '#app/models/Invitation.js';
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

        const createdInvitation = await Invitation.create({
            name: name,
            token: Buffer.from(randomUUID()).toString('base64'),
            userId: userId,
            expiresAt,
        });

        return {
            status: 'success',
            message: 'Invitation created successfully',
            token: createdInvitation.token,
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

        const invitationsData = await Invitation.findByUserId(BigInt(userId));

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
        let status: 'success' | 'error' | 'awaiting' = 'awaiting';

        const sessionInfo = session?.sessionInfo;
        if (sessionInfo) {
            const userId = sessionInfo.data?.userId;
            if (userId) {
                await inventionAccept(token, Number(userId));
                logger.info('inventionAccept');
                status = 'success';
            }else{
                session.updateSessionData({
                    inventionToken: token,
                });
            }
        }

        return { status };
    },
};
