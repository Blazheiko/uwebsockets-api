import type {
    CreateEventInput,
    GetEventsByRangeInput,
    UpdateEventInput,
} from '../controllers/types/CalendarController.js';
import { calendarRepository } from '#app/repositories/index.js';
import { calendarTransformer } from '#app/transformers/index.js';
import { failure, success, type ServiceResult } from '#app/services/shared/service-result.js';

export const calendarService = {
    async getEvents(
        userId: bigint,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serializeArray> }>> {
        const events = await calendarRepository.findByUserId(userId);
        return success({ data: calendarTransformer.serializeArray(events) });
    },

    async createEvent(
        userId: bigint,
        payload: CreateEventInput,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serialize> }>> {
        const created = await calendarRepository.create({
            title: payload.title,
            description: payload.description ?? '',
            startTime: new Date(payload.startTime),
            endTime: new Date(payload.endTime),
            userId,
        });

        return success({ data: calendarTransformer.serialize(created) });
    },

    async getEvent(
        userId: bigint,
        eventId: bigint,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serialize> }>> {
        const event = await calendarRepository.findByIdAndUserId(eventId, userId);
        if (event === undefined) {
            return failure('NOT_FOUND', 'Event not found');
        }

        return success({ data: calendarTransformer.serialize(event) });
    },

    async updateEvent(
        userId: bigint,
        eventId: bigint,
        payload: UpdateEventInput,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serialize> }>> {
        const updateData: {
            title?: string;
            description?: string;
            startTime?: Date;
            endTime?: Date;
        } = {};

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.startTime !== undefined) updateData.startTime = new Date(payload.startTime);
        if (payload.endTime !== undefined) updateData.endTime = new Date(payload.endTime);

        const updated = await calendarRepository.update(eventId, userId, updateData);
        if (updated === undefined) {
            return failure('NOT_FOUND', 'Event not found');
        }

        return success({ data: calendarTransformer.serialize(updated) });
    },

    async deleteEvent(
        userId: bigint,
        eventId: bigint,
    ): Promise<ServiceResult<{ message: string }>> {
        const deleted = await calendarRepository.delete(eventId, userId);
        if (!deleted) {
            return failure('NOT_FOUND', 'Event not found');
        }

        return success({ message: 'Event deleted successfully' });
    },

    async getEventsByDate(
        userId: bigint,
        date: string,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serializeArray> }>> {
        const events = await calendarRepository.findByDate(userId, new Date(date));
        return success({ data: calendarTransformer.serializeArray(events) });
    },

    async getEventsByRange(
        userId: bigint,
        payload: GetEventsByRangeInput,
    ): Promise<ServiceResult<{ data: ReturnType<typeof calendarTransformer.serializeArray> }>> {
        const events = await calendarRepository.findByRange(
            userId,
            new Date(payload.startDate),
            new Date(payload.endDate),
        );
        return success({ data: calendarTransformer.serializeArray(events) });
    },
};
