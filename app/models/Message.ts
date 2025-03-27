import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/model.js';
import logger from '#logger';
import { MessageType } from '@prisma/client';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['senderId', 'receiverId', 'content', 'type'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create message');
        if (!payload || typeof payload !== 'object')
            return new Error('Payload must be object');
        
        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        // Validate message type
        if (!Object.values(MessageType).includes(payload.type)) {
            throw new Error('Invalid message type');
        }

        // Validate src for media types
        if (payload.type !== MessageType.TEXT && !payload.src) {
            throw new Error('Source URL is required for media messages');
        }

        // Start transaction to create message and update unread count
        const result = await prisma.$transaction(async (prisma) => {
            // Create message
            const message = await prisma.message.create({
                data: {
                    senderId: payload.senderId,
                    receiverId: payload.receiverId,
                    type: payload.type,
                    content: payload.content,
                    src: payload.src,
                    isRead: false
                },
                include: {
                    sender: true,
                    receiver: true
                }
            });

            // Update unread count in contact list
            await prisma.contactList.update({
                where: {
                    userId_contactId: {
                        userId: payload.receiverId,
                        contactId: payload.senderId
                    }
                },
                data: {
                    unreadCount: {
                        increment: 1
                    }
                }
            });

            return message;
        });

        return serializeModel(result, schema, hidden);
    },

    async findById(id: number) {
        logger.info(`find message by id: ${id}`);
        const message = await prisma.message.findUnique({
            where: { id },
            include: {
                sender: true,
                receiver: true
            }
        });
        
        if (!message) {
            throw new Error(`Message with id ${id} not found`);
        }
        
        return serializeModel(message, schema, hidden);
    },

    async update(id: number, payload: any) {
        const updateData = {
            ...payload,
            updatedAt: DateTime.now().toISO(),
        };

        const message = await prisma.message.update({
            where: { id },
            data: updateData,
            include: {
                sender: true,
                receiver: true
            }
        });
        return serializeModel(message, schema, hidden);
    },

    async delete(id: number) {
        logger.info(`delete message with id: ${id}`);
        const result = await prisma.message.delete({
            where: { id }
        });
        return result;
    },

    async findConversation(userId1: number, userId2: number) {
        logger.info(`find conversation between users: ${userId1} and ${userId2}`);
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId1, receiverId: userId2 },
                    { senderId: userId2, receiverId: userId1 }
                ]
            },
            include: {
                sender: true,
                receiver: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        return this.serializeArray(messages);
    },

    async markAsRead(messageId: number, userId: number) {
        logger.info(`mark message ${messageId} as read for user ${userId}`);
        
        // Start transaction to update message and contact list
        const result = await prisma.$transaction(async (prisma) => {
            // Get message to find sender
            const message = await prisma.message.findUnique({
                where: { id: messageId }
            });

            if (!message) {
                throw new Error(`Message with id ${messageId} not found`);
            }

            if (message.receiverId !== userId) {
                throw new Error('User is not the receiver of this message');
            }

            // Update message status
            const updatedMessage = await prisma.message.update({
                where: { id: messageId },
                data: { isRead: true },
                include: {
                    sender: true,
                    receiver: true
                }
            });

            // Update unread count in contact list
            await prisma.contactList.update({
                where: {
                    userId_contactId: {
                        userId: userId,
                        contactId: message.senderId
                    }
                },
                data: {
                    unreadCount: {
                        decrement: 1
                    }
                }
            });

            return updatedMessage;
        });

        return serializeModel(result, schema, hidden);
    },

    async getUnreadCount(userId: number) {
        logger.info(`get unread messages count for user ${userId}`);
        const count = await prisma.message.count({
            where: {
                receiverId: userId,
                isRead: false
            }
        });
        return count;
    },

    query() {
        return prisma.message;
    },

    serialize(message: any) {
        return serializeModel(message, schema, hidden);
    },

    serializeArray(messages: any) {
        return messages.map((message: any) => serializeModel(message, schema, hidden));
    },
}; 