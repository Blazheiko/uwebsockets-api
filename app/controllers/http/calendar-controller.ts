import { HttpContext } from '../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getEvents(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getEvents handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const events = await prisma.calendar.findMany({
                where: { userId: auth.user.id },
                orderBy: { startTime: 'asc' },
            });
            return { status: 'success', data: events };
        } catch (error) {
            logger.error({ err: error }, 'Error getting events:');
            return { status: 'error', message: 'Failed to get events' };
        }
    },

    async createEvent(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('createEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description, startTime, endTime } = httpData.payload;

        try {
            const event = await prisma.calendar.create({
                data: {
                    title,
                    description,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    userId: auth.user.id,
                },
            });
            return { status: 'success', data: event };
        } catch (error) {
            logger.error({ err: error }, 'Error creating event:');
            return { status: 'error', message: 'Failed to create event' };
        }
    },

    async getEvent(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };

        try {
            const event = await prisma.calendar.findFirst({
                where: {
                    id: parseInt(eventId),
                    userId: auth.user.id,
                },
            });

            if (!event) {
                return { status: 'error', message: 'Event not found' };
            }

            return { status: 'success', data: event };
        } catch (error) {
            logger.error({ err: error }, 'Error getting event:');
            return { status: 'error', message: 'Failed to get event' };
        }
    },

    async updateEvent(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };
        const { title, description, startTime, endTime } = httpData.payload;

        try {
            const event = await prisma.calendar.updateMany({
                where: {
                    id: parseInt(eventId),
                    userId: auth.user.id,
                },
                data: {
                    title,
                    description,
                    startTime: startTime ? new Date(startTime) : undefined,
                    endTime: endTime ? new Date(endTime) : undefined,
                },
            });

            if (event.count === 0) {
                return { status: 'error', message: 'Event not found' };
            }

            const updatedEvent = await prisma.calendar.findUnique({
                where: { id: parseInt(eventId) },
            });

            return { status: 'success', data: updatedEvent };
        } catch (error) {
            logger.error({ err: error }, 'Error updating event:');
            return { status: 'error', message: 'Failed to update event' };
        }
    },

    async deleteEvent(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deleteEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };

        try {
            const deleted = await prisma.calendar.deleteMany({
                where: {
                    id: parseInt(eventId),
                    userId: auth.user.id,
                },
            });

            if (deleted.count === 0) {
                return { status: 'error', message: 'Event not found' };
            }

            return { status: 'success', message: 'Event deleted successfully' };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting event:');
            return { status: 'error', message: 'Failed to delete event' };
        }
    },

    async getEventsByDate(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getEventsByDate handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { date } = httpData.params as { date: string };

        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const events = await prisma.calendar.findMany({
                where: {
                    userId: auth.user.id,
                    OR: [
                        {
                            startTime: {
                                gte: startOfDay,
                                lte: endOfDay,
                            },
                        },
                        {
                            endTime: {
                                gte: startOfDay,
                                lte: endOfDay,
                            },
                        },
                        {
                            AND: [
                                { startTime: { lte: startOfDay } },
                                { endTime: { gte: endOfDay } },
                            ],
                        },
                    ],
                },
                orderBy: { startTime: 'asc' },
            });

            return { status: 'success', data: events };
        } catch (error) {
            logger.error({ err: error }, 'Error getting events by date:');
            return { status: 'error', message: 'Failed to get events by date' };
        }
    },

    async getEventsByRange(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getEventsByRange handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { startDate, endDate } = httpData.payload;

        try {
            const events = await prisma.calendar.findMany({
                where: {
                    userId: auth.user.id,
                    OR: [
                        {
                            startTime: {
                                gte: new Date(startDate),
                                lte: new Date(endDate),
                            },
                        },
                        {
                            endTime: {
                                gte: new Date(startDate),
                                lte: new Date(endDate),
                            },
                        },
                        {
                            AND: [
                                { startTime: { lte: new Date(startDate) } },
                                { endTime: { gte: new Date(endDate) } },
                            ],
                        },
                    ],
                },
                orderBy: { startTime: 'asc' },
            });

            return { status: 'success', data: events };
        } catch (error) {
            logger.error({ err: error }, 'Error getting events by range:');
            return {
                status: 'error',
                message: 'Failed to get events by range',
            };
        }
    },
};
