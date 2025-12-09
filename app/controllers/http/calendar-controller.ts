import { HttpContext } from '../../../vendor/types/types.js';
import calendarModel from '#app/models/Calendar.js';
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
            const events = await calendarModel.findByUserId(auth.user.id);
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
            const createdEvent = await calendarModel.create({
                title,
                description,
                startTime,
                endTime,
                userId: auth.user.id,
            });

            return { status: 'success', data: createdEvent };
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
            const event = await calendarModel.findById(
                BigInt(eventId),
                auth.user.id,
            );
            return { status: 'success', data: event };
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
            const updatedEvent = await calendarModel.update(
                BigInt(eventId),
                auth.user.id,
                {
                    title,
                    description,
                    startTime,
                    endTime,
                },
            );

            return { status: 'success', data: updatedEvent };
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
            await calendarModel.delete(BigInt(eventId), auth.user.id);
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
            const events = await calendarModel.findByDate(
                auth.user.id,
                new Date(date),
            );
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
            const events = await calendarModel.findByRange(
                auth.user.id,
                new Date(startDate),
                new Date(endDate),
            );
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
