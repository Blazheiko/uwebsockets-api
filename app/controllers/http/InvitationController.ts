import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';


const prisma = new PrismaClient();

export const InvitationController = {
  // Создание нового приглашения
  async createInvitation(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const expiresIn = 7; // Срок действия приглашения в днях

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);

      const invitation = await prisma.invitation.create({
        data: {
          token: randomUUID(),
          userId: parseInt(userId),
          expiresAt,
        },
      });

      return res.status(201).json(invitation);
    } catch (error) {
      console.error('Error creating invitation:', error);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }
  },

  // Получение всех приглашений пользователя
  async getUserInvitations(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
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

      return res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  },

  // Проверка и использование приглашения
  async useInvitation(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { invitedId } = req.body;

      if (!token || !invitedId) {
        return res.status(400).json({ error: 'Token and invited user ID are required' });
      }

      const invitation = await prisma.invitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      if (invitation.isUsed) {
        return res.status(400).json({ error: 'Invitation has already been used' });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      const updatedInvitation = await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          isUsed: true,
          invitedId: parseInt(invitedId),
        },
      });

      return res.json(updatedInvitation);
    } catch (error) {
      console.error('Error using invitation:', error);
      return res.status(500).json({ error: 'Failed to use invitation' });
    }
  },
}; 