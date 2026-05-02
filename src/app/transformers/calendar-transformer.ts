import { DateTime } from 'luxon';
import type { CalendarRow } from '#app/repositories/calendar-repository.js';

export type SerializedCalendarEvent = Omit<
    CalendarRow,
    'id' | 'userId' | 'createdAt' | 'updatedAt' | 'startTime' | 'endTime'
> & {
    id: string;
    userId: string;
    created_at: string | null;
    updated_at: string | null;
    startTime: string | null;
    endTime: string | null;
};

export const calendarTransformer = {
    serialize(event: CalendarRow): SerializedCalendarEvent {
        const { createdAt, updatedAt, startTime, endTime, id, userId, ...rest } = event;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            startTime: DateTime.fromJSDate(startTime).toISO(),
            endTime: DateTime.fromJSDate(endTime).toISO(),
        };
    },

    serializeArray(events: CalendarRow[]): SerializedCalendarEvent[] {
        return events.map((e) => calendarTransformer.serialize(e));
    },
};
