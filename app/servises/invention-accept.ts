import { prisma } from '#database/prisma.js';
import ContactList from '../models/contact-list.js';
import logger from '../../logger.js';

export default async (token: string, userId: number) => {
    console.log('inventionAccept');
    if(!token || !userId) return;

    const invention = await prisma.invitation.findFirst({ where: { token , isUsed: false} });
    if(!invention || Number(invention.invitedId) === userId) return;

    await prisma.invitation.update({
        where: { id: invention.id },
        data: {
            isUsed: true,
            invitedId: Number(userId)
        }
    });

    const contact = await prisma.contactList.findFirst({
            where: {userId, contactId: invention.userId},
            select: {id: true}
        })
    if(!contact) {
        await prisma.contactList.create({
            data: {
                userId: Number(userId),
                contactId: Number(invention.userId),
                status: 'accepted',
                rename: null
            }
        })
    }

    const contactOwner = await prisma.contactList.findFirst({
        where: {userId: invention.userId, contactId: userId,},
        select: {id: true}
    })

    if(!contactOwner) {
        await prisma.contactList.create({
            data: {
                userId: Number(invention.userId),
                contactId: Number(userId),
                status: 'accepted',
                rename: invention.name
            }
        })
    }
}