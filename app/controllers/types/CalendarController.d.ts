/**
 * Response types for CalendarController
 */

export interface CalendarEvent {
    id: bigint;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    userId: bigint;
    createdAt: Date;
    updatedAt: Date;
}

export interface GetEventsResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent[];
}

export interface CreateEventResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent;
}

export interface GetEventResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent | null;
}

export interface UpdateEventResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent | null;
}

export interface DeleteEventResponse {
    status: 'success' | 'error';
    message?: string;
}

export interface GetEventsByDateResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent[];
}

export interface GetEventsByRangeResponse {
    status: 'success' | 'error';
    message?: string;
    data?: CalendarEvent[];
}
