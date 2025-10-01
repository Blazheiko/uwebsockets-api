/**
 * Response types for CalendarController
 */

export interface CalendarEvent {
    id: number;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface GetEventsResponse {
    status: 'ok';
    events: CalendarEvent[];
}

export interface CreateEventResponse {
    status: 'ok' | 'error';
    message?: string;
    event?: CalendarEvent;
}

export interface GetEventResponse {
    status: 'ok' | 'error';
    message?: string;
    event?: CalendarEvent;
}

export interface UpdateEventResponse {
    status: 'ok' | 'error';
    message?: string;
    event?: CalendarEvent;
}

export interface DeleteEventResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface GetEventsByDateResponse {
    status: 'ok';
    events: CalendarEvent[];
    date: string;
}

export interface GetEventsByRangeResponse {
    status: 'ok';
    events: CalendarEvent[];
    startDate: string;
    endDate: string;
}
