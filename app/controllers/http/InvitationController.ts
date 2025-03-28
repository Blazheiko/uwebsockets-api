import { randomUUID } from 'crypto';
import { prisma } from '#database/prisma.js';
import { HttpContext } from '../../../vendor/types/types.js';
import logger from '#logger';
export default {
  // Создание нового приглашения
  async createInvitation(context: HttpContext) {
    logger.info('createInvitation');
    const { httpData, session } = context;
    const {userId , name } = httpData.payload;
  
    const expiresIn = 7; // Срок действия приглашения в днях
    const sessionInfo = session?.sessionInfo;
    const userIdFromSession = sessionInfo?.data?.userId;
    if (!userId || !userIdFromSession || +userId !== +userIdFromSession || !name) {
      logger.error('User ID is required');
      return { status: 'error', message: 'User ID is required' };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    const invitation = await prisma.invitation.create({
      data: {
        name: name,
        token: Buffer.from(randomUUID()).toString('base64'),
        userId: parseInt(userId),
        expiresAt,
        // Pass the name as a custom field if needed
        // or remove it if not part of the Invitation model
      },
    });

    return { status: 'success', message: 'Invitation created successfully', token: invitation.token };
   
  },

  // Получение всех приглашений пользователя
  async getUserInvitations(context: HttpContext) {
    logger.info('getUserInvitations');
    const { httpData, responseData } = context;
    const { userId } = httpData.payload;

    if (!userId) {
      responseData.status = 400;
      return { status: 'error', message: 'User ID is required' };
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        invited: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return { status: 'success', invitations };
  },

  // Проверка и использование приглашения
  async useInvitation(context: HttpContext) {
    logger.info('useInvitation');
    const { httpData, responseData } = context;
    const { token, invitedId } = httpData.payload;

    if (!token || !invitedId) {
      responseData.status = 400;
      return { status: 'error', message: 'Token and invited user ID are required' };
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      responseData.status = 404;
      return { status: 'error', message: 'Invitation not found' };
    }

    if (invitation.isUsed) {
      responseData.status = 400;
      return { status: 'error', message: 'Invitation has already been used' };
    }

    if (invitation.expiresAt < new Date()) {
      responseData.status = 400;
      return { status: 'error', message: 'Invitation has expired' };
    }

    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        isUsed: true,
        invitedId: parseInt(invitedId),
      },
    });

    return { status: 'success', invitation: updatedInvitation };
  },
}; 