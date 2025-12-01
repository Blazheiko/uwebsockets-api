import { HttpContext } from '../../../vendor/types/types.js';
import { db } from '#database/db.js';
import { calendar } from '#database/schema.js';
import { eq, and, or, gte, lte, asc, sql } from 'drizzle-orm';
import type {
    GetEventsResponse,
    CreateEventResponse,
    GetEventResponse,
    UpdateEventResponse,
    DeleteEventResponse,
    GetEventsByDateResponse,
    GetEventsByRangeResponse,
} from '../types/CalendarController.js';

export default {
    async getEvents(context: HttpContext): Promise<GetEventsResponse> {
        const { auth, logger } = context;
        logger.info('getEvents handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const events = await db.select()
                .from(calendar)
                .where(eq(calendar.userId, auth.user.id))
                .orderBy(asc(calendar.startTime));
            return { status: 'success', data: events };
        } catch (error) {
            logger.error({ err: error }, 'Error getting events:');
            return { status: 'error', message: 'Failed to get events' };
        }
    },

    async createEvent(context: HttpContext): Promise<CreateEventResponse> {
        const { httpData, auth, logger } = context;
        logger.info('createEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description, startTime, endTime } = httpData.payload;

        try {
            const now = new Date();
            const [eventResult] = await db.insert(calendar).values({
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                userId: auth.user.id,
                createdAt: now,
                updatedAt: now,
            });

            const createdEvent = await db.select()
                .from(calendar)
                .where(eq(calendar.id, BigInt(eventResult.insertId)))
                .limit(1);

            return { status: 'success', data: createdEvent[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error creating event:');
            return { status: 'error', message: 'Failed to create event' };
        }
    },

    async getEvent(context: HttpContext): Promise<GetEventResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };

        try {
            const event = await db.select()
                .from(calendar)
                .where(and(
                    eq(calendar.id, BigInt(eventId)),
                    eq(calendar.userId, auth.user.id)
                ))
                .limit(1);

            if (event.length === 0) {
                return { status: 'error', message: 'Event not found' };
            }

            return { status: 'success', data: event[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error getting event:');
            return { status: 'error', message: 'Failed to get event' };
        }
    },

    async updateEvent(context: HttpContext): Promise<UpdateEventResponse> {
        const { httpData, auth, logger } = context;
        logger.info('updateEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };
        const { title, description, startTime, endTime } = httpData.payload;

        try {
            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (startTime !== undefined) updateData.startTime = new Date(startTime);
            if (endTime !== undefined) updateData.endTime = new Date(endTime);

            await db.update(calendar)
                .set(updateData)
                .where(and(
                    eq(calendar.id, BigInt(eventId)),
                    eq(calendar.userId, auth.user.id)
                ));

            const updatedEvent = await db.select()
                .from(calendar)
                .where(eq(calendar.id, BigInt(eventId)))
                .limit(1);

            if (updatedEvent.length === 0) {
                return { status: 'error', message: 'Event not found' };
            }

            return { status: 'success', data: updatedEvent[0] };
        } catch (error) {
            logger.error({ err: error }, 'Error updating event:');
            return { status: 'error', message: 'Failed to update event' };
        }
    },

    async deleteEvent(context: HttpContext): Promise<DeleteEventResponse> {
        const { httpData, auth, logger } = context;
        logger.info('deleteEvent handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { eventId } = httpData.params as { eventId: string };

        try {
            await db.delete(calendar)
                .where(and(
                    eq(calendar.id, BigInt(eventId)),
                    eq(calendar.userId, auth.user.id)
                ));

            // Verify deletion
            const checkDeleted = await db.select({ count: sql<number>`count(*)` })
                .from(calendar)
                .where(eq(calendar.id, BigInt(eventId)));

            if (checkDeleted[0]?.count > 0) {
                return { status: 'error', message: 'Event not found' };
            }

            return { status: 'success', message: 'Event deleted successfully' };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting event:');
            return { status: 'error', message: 'Failed to delete event' };
        }
    },

    async getEventsByDate(
        context: HttpContext,
    ): Promise<GetEventsByDateResponse> {
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

            const events = await db.select()
                .from(calendar)
                .where(and(
                    eq(calendar.userId, auth.user.id),
                    or(
                        and(
                            gte(calendar.startTime, startOfDay),
                            lte(calendar.startTime, endOfDay)
                        ),
                        and(
                            gte(calendar.endTime, startOfDay),
                            lte(calendar.endTime, endOfDay)
                        ),
                        and(
                            lte(calendar.startTime, startOfDay),
                            gte(calendar.endTime, endOfDay)
                        )
                    )
                ))
                .orderBy(asc(calendar.startTime));

            return { status: 'success', data: events };
        } catch (error) {
            logger.error({ err: error }, 'Error getting events by date:');
            return { status: 'error', message: 'Failed to get events by date' };
        }
    },

    async getEventsByRange(
        context: HttpContext,
    ): Promise<GetEventsByRangeResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getEventsByRange handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { startDate, endDate } = httpData.payload;

        try {
            const events = await db.select()
                .from(calendar)
                .where(and(
                    eq(calendar.userId, auth.user.id),
                    or(
                        and(
                            gte(calendar.startTime, new Date(startDate)),
                            lte(calendar.startTime, new Date(endDate))
                        ),
                        and(
                            gte(calendar.endTime, new Date(startDate)),
                            lte(calendar.endTime, new Date(endDate))
                        ),
                        and(
                            lte(calendar.startTime, new Date(startDate)),
                            gte(calendar.endTime, new Date(endDate))
                        )
                    )
                ))
                .orderBy(asc(calendar.startTime));

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
