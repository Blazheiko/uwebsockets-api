import { prisma } from '#database/prisma.js';

export default async (token: string, userId: number) => {
    console.log('inventionAccept');
    if(token){
        const invention = await prisma.invitation.findFirst({ where: { token , isUsed: false} });
        if(invention){
            await prisma.invitation.update({
                where: { id: invention.id },
                data: {
                    isUsed: true,
                    invitedId: userId
                }
            });
            await prisma.contactList.create({
                data: {
                    userId: userId,
                    contactId: invention.userId,
                    status: 'accepted'
                }
            })
            await prisma.contactList.create({
                data: {
                    userId: invention.userId,
                    contactId: userId,
                    status: 'accepted'
                }
            })
        }
    }
}