import { randomUUID } from 'crypto';
import { prisma } from '#database/prisma.js';
import { HttpContext } from '../../../vendor/types/types.js';
import inventionAccept from '#app/servises/inventionAccept.js';
export default {
  // Создание нового приглашения
  async createInvitation({ httpData, session, logger }: HttpContext) {
    logger.info('createInvitation');
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
  async getUserInvitations({ httpData, responseData, logger }: HttpContext) {
    logger.info('getUserInvitations');

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
  async useInvitation({ httpData, responseData, logger, session }: HttpContext) {
    logger.info('useInvitation');

    const { token } = httpData.payload;

    logger.info(token);

    if (!token ) {
      responseData.status = 400;
      return { status: 'error', message: 'Token are required' };
    }

    const sessionInfo = session?.sessionInfo;
    if (sessionInfo) {
      const userId = sessionInfo.data?.userId;
      if( userId ){
        await inventionAccept(token, Number(userId))
        logger.info('inventionAccept');
        return { status: 'success'};
      }
    }

    return { status: 'awaiting', };
  },
}; 