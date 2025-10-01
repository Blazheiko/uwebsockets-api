/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ../../../app/controllers/http/types/index.d.ts
 * Generated at: 2025-10-01T14:37:09.959Z
 * 
 * To update this file, run: npm run export-types
 */

/**
 * Central export file for all controller response types
 * This file aggregates all response types from individual controllers
 */

// Base types
export interface BaseResponse {
    status: string;
}

export interface ErrorResponse extends BaseResponse {
    status: 'error' | 'unauthorized';
    message: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
    status: 'ok';
    data?: T;
}

// Main Controller
export type {
    PingResponse,
    InitResponse,
    TestHeadersResponse,
    GetSetCookiesResponse,
    TestSessionResponse,
    SaveUserResponse,
} from './MainController.js';

// Auth Controller
export type {
    RegisterResponse,
    LoginResponse,
    LogoutResponse,
} from './AuthController.js';

// Chat Controllers
export type {
    GetContactListResponse,
    CreateChatResponse,
    DeleteChatResponse,
    GetMessagesResponse,
    SendMessageResponse,
    DeleteMessageResponse,
    EditMessageResponse,
    MarkAsReadResponse,
} from './ChatController.js';

// Invitation Controller
export type {
    CreateInvitationResponse,
    GetUserInvitationsResponse,
    UseInvitationResponse,
} from './InvitationController.js';

// Notes Controller
export type {
    Note,
    NotePhoto,
    GetNotesResponse,
    CreateNoteResponse,
    GetNoteResponse,
    UpdateNoteResponse,
    DeleteNoteResponse,
    AddPhotoResponse,
    DeletePhotoResponse,
} from './NotesController.js';

// Calendar Controller
export type {
    CalendarEvent,
    GetEventsResponse,
    CreateEventResponse,
    GetEventResponse,
    UpdateEventResponse,
    DeleteEventResponse,
    GetEventsByDateResponse,
    GetEventsByRangeResponse,
} from './CalendarController.js';

// Task Controller
export type {
    Task,
    GetTasksResponse,
    CreateTaskResponse,
    GetTaskResponse,
    UpdateTaskResponse,
    DeleteTaskResponse,
    UpdateTaskStatusResponse,
    UpdateTaskProgressResponse,
    GetTasksByProjectResponse,
    GetSubTasksResponse,
} from './TaskController.js';

// Project Controller
export type {
    Project,
    GetProjectsResponse,
    CreateProjectResponse,
    GetProjectResponse,
    UpdateProjectResponse,
    DeleteProjectResponse,
    GetProjectTasksResponse,
    GetProjectStatisticsResponse,
    ArchiveProjectResponse,
} from './ProjectController.js';

// Push Subscription Controller
export type {
    PushSubscription,
    PushSubscriptionLog,
    GetSubscriptionsResponse,
    CreateSubscriptionResponse,
    GetSubscriptionResponse,
    UpdateSubscriptionResponse,
    DeleteSubscriptionResponse,
    GetSubscriptionLogsResponse,
    GetSubscriptionStatisticsResponse,
    DeactivateSubscriptionResponse,
} from './PushSubscriptionController.js';

// Response type registry for documentation
export type ResponseTypeRegistry = {
    // Main Controller
    ping: import('./MainController.js').PingResponse;
    init: import('./MainController.js').InitResponse;
    testHeaders: import('./MainController.js').TestHeadersResponse;
    getSetCookies: import('./MainController.js').GetSetCookiesResponse;
    testSession: import('./MainController.js').TestSessionResponse;
    saveUser: import('./MainController.js').SaveUserResponse;

    // Auth Controller
    register: import('./AuthController.js').RegisterResponse;
    login: import('./AuthController.js').LoginResponse;
    logout: import('./AuthController.js').LogoutResponse;

    // Chat Controller
    getContactList: import('./ChatController.js').GetContactListResponse;
    createChat: import('./ChatController.js').CreateChatResponse;
    deleteChat: import('./ChatController.js').DeleteChatResponse;
    getMessages: import('./ChatController.js').GetMessagesResponse;
    sendMessage: import('./ChatController.js').SendMessageResponse;

    // Notes Controller
    getNotes: import('./NotesController.js').GetNotesResponse;
    createNote: import('./NotesController.js').CreateNoteResponse;
    getNote: import('./NotesController.js').GetNoteResponse;
    updateNote: import('./NotesController.js').UpdateNoteResponse;
    deleteNote: import('./NotesController.js').DeleteNoteResponse;

    // Calendar Controller
    getEvents: import('./CalendarController.js').GetEventsResponse;
    createEvent: import('./CalendarController.js').CreateEventResponse;
    getEvent: import('./CalendarController.js').GetEventResponse;
    updateEvent: import('./CalendarController.js').UpdateEventResponse;
    deleteEvent: import('./CalendarController.js').DeleteEventResponse;

    // Task Controller
    getTasks: import('./TaskController.js').GetTasksResponse;
    createTask: import('./TaskController.js').CreateTaskResponse;
    getTask: import('./TaskController.js').GetTaskResponse;
    updateTask: import('./TaskController.js').UpdateTaskResponse;
    deleteTask: import('./TaskController.js').DeleteTaskResponse;

    // Project Controller
    getProjects: import('./ProjectController.js').GetProjectsResponse;
    createProject: import('./ProjectController.js').CreateProjectResponse;
    getProject: import('./ProjectController.js').GetProjectResponse;
    updateProject: import('./ProjectController.js').UpdateProjectResponse;
    deleteProject: import('./ProjectController.js').DeleteProjectResponse;
    getProjectStatistics: import('./ProjectController.js').GetProjectStatisticsResponse;
};

// Helper type for controller handlers with typed responses
export type TypedHandler<TResponse> = (...args: any[]) => Promise<TResponse>;
