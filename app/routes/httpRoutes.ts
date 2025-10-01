import MainController from '#app/controllers/http/MainController.js';
import AuthController from '#app/controllers/http/AuthController.js';
import ChatListController from '#app/controllers/http/ChatListController.js';
import MessageController from '#app/controllers/http/MessageController.js';
import InvitationController from '#app/controllers/http/InvitationController.js';
import NotesController from '#app/controllers/http/NotesController.js';
import CalendarController from '#app/controllers/http/CalendarController.js';
import TaskController from '#app/controllers/http/TaskController.js';
import ProjectController from '#app/controllers/http/ProjectController.js';
import PushSubscriptionController from '#app/controllers/http/PushSubscriptionController.js';

export default [
    {
        group: [
            {
                url: '/register',
                method: 'post',
                handler: AuthController.register,
                validator: 'register',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,
                },
                description: 'Register a new user',
            },
            {
                url: '/login',
                method: 'post',
                handler: AuthController.login,
                validator: 'login',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,
                },
                description: 'Login a user',
            },
            {
                url: '/logout',
                method: 'post',
                handler: AuthController.logout,
                description: 'Logout a user',
            },
        ],
        description: 'Auth routes',
        middlewares: ['session_web'],
        prefix: 'api/auth',
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
        },
    },
    {
        group: [
            {
                url: '/get-contact-list',
                method: 'post',
                handler: ChatListController.getContactList,
                description: 'Get contact list',
            },
            {
                url: '/chats',
                method: 'post',
                handler: ChatListController.createChat,
                validator: 'createChat',
                description: 'Create a new chat',
            },
            {
                url: '/chats/:chatId',
                method: 'delete',
                handler: ChatListController.deleteChat,
                validator: 'deleteChat',
                description: 'Delete a chat',
            },
            {
                url: '/get-messages',
                method: 'post',
                handler: MessageController.getMessages,
                validator: 'getMessages',
                description: 'Get messages',
            },
            {
                url: '/send-chat-messages',
                method: 'post',
                handler: MessageController.sendMessage,
                validator: 'sendMessage',
                description: 'Send a message',
            },
            {
                url: '/messages/:messageId',
                method: 'delete',
                handler: MessageController.deleteMessage,
                validator: 'deleteMessage',
                description: 'Delete a message',
            },
            {
                url: '/messages/:messageId',
                method: 'put',
                handler: MessageController.editMessage,
                validator: 'editMessage',
                description: 'Edit a message',
            },
            {
                url: '/messages/:messageId/read',
                method: 'put',
                handler: MessageController.markAsRead,
                validator: 'markMessageAsRead',
                description: 'Mark a message as read',
            },
            // Invitation Routes
            {
                url: '/invitations',
                method: 'post',
                handler: InvitationController.createInvitation,
                validator: 'createInvitation',
                description: 'Create an invitation',
            },
            {
                url: '/invitations/user/:userId',
                method: 'get',
                handler: InvitationController.getUserInvitations,
                validator: 'getUserInvitations',
                description: 'Get user invitations',
            },
            {
                url: '/invitations/use',
                method: 'post',
                handler: InvitationController.useInvitation,
                validator: 'useInvitation',
                description: 'Use an invitation',
            },
        ],
        description: 'Chat routes',
        middlewares: ['session_web'],
        prefix: 'api/chat',
    },
    {
        group: [
            {
                url: '/init',
                method: 'get',
                handler: MainController.init,
                description: 'Initialize the main controller',
            },
            {
                url: '/test-header/:testParam/param2/:testParam2',
                method: 'get',
                handler: MainController.testHeaders,
                description: 'Test headers',
            },
            {
                url: '/test-cookie',
                method: 'get',
                handler: MainController.getSetCookies,
                description: 'Test cookies',
            },
            {
                url: '/test-session',
                method: 'get',
                handler: MainController.testSession,
                description: 'Test session',
            },
            {
                url: '/save-user',
                method: 'post',
                handler: MainController.saveUser,
                validator: 'register',
                description: 'Save a user',
            },
            {
                url: '/set-header-and-cookie',
                method: 'get',
                handler: MainController.setHeaderAndCookie,
                description: 'Set header and cookie',
            },
            {
                url: '/test-middleware',
                method: 'get',
                handler: MainController.testMiddleware,
                middlewares: ['test1'],
                description: 'Test middleware',
            },
        ],
        description: 'Main routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            // Notes Routes
            {
                url: '/notes',
                method: 'get',
                handler: NotesController.getNotes,
                description: 'Get all notes',
            },
            {
                url: '/notes',
                method: 'post',
                handler: NotesController.createNote,
                validator: 'createNote',
                description: 'Create a new note',
            },
            {
                url: '/notes/:noteId',
                method: 'get',
                handler: NotesController.getNote,
                validator: 'getNote',
                description: 'Get a note by id',
            },
            {
                url: '/notes/:noteId',
                method: 'put',
                handler: NotesController.updateNote,
                validator: 'updateNote',
                description: 'Update a note by id',
            },
            {
                url: '/notes/:noteId',
                method: 'delete',
                handler: NotesController.deleteNote,
                validator: 'deleteNote',
                description: 'Delete a note by id',
            },
            // Notes Photo Routes
            {
                url: '/notes/:noteId/photos',
                method: 'post',
                handler: NotesController.addPhoto,
                validator: 'addNotePhoto',
                description: 'Add a photo to a note',
            },
            {
                url: '/notes/:noteId/photos/:photoId',
                method: 'delete',
                handler: NotesController.deletePhoto,
                validator: 'deleteNotePhoto',
                description: 'Delete a photo from a note',
            },
        ],
        description: 'Notes routes',
        middlewares: ['session_web'],
        prefix: 'api/notes',
    },
    {
        group: [
            // Calendar Routes
            {
                url: '/events',
                method: 'get',
                handler: CalendarController.getEvents,
                description: 'Get all events',
            },
            {
                url: '/events',
                method: 'post',
                handler: CalendarController.createEvent,
                validator: 'createEvent',
                description: 'Create a new event',
            },
            {
                url: '/events/:eventId',
                method: 'get',
                handler: CalendarController.getEvent,
                validator: 'getEvent',
                description: 'Get an event by id',
            },
            {
                url: '/events/:eventId',
                method: 'put',
                handler: CalendarController.updateEvent,
                validator: 'updateEvent',
                description: 'Update an event by id',
            },
            {
                url: '/events/:eventId',
                method: 'delete',
                handler: CalendarController.deleteEvent,
                validator: 'deleteEvent',
                description: 'Delete an event by id',
            },
            // Calendar specific routes
            {
                url: '/events/date/:date',
                method: 'get',
                handler: CalendarController.getEventsByDate,
                validator: 'getEventsByDate',
                description: 'Get all events for a date',
            },
            {
                url: '/events/range',
                method: 'post',
                handler: CalendarController.getEventsByRange,
                validator: 'getEventsByRange',
                description: 'Get all events for a range of dates',
            },
        ],
        description: 'Calendar routes',
        middlewares: ['session_web'],
        prefix: 'api/calendar',
    },
    {
        group: [
            // Task Routes
            {
                url: '/tasks',
                method: 'get',
                handler: TaskController.getTasks,
                description: 'Get all tasks',
            },
            {
                url: '/tasks',
                method: 'post',
                handler: TaskController.createTask,
                validator: 'createTask',
                description: 'Create a new task',
            },
            {
                url: '/tasks/:taskId',
                method: 'get',
                handler: TaskController.getTask,
                validator: 'getTask',
                description: 'Get a task by id',
            },
            {
                url: '/tasks/:taskId',
                method: 'put',
                handler: TaskController.updateTask,
                validator: 'updateTask',
                description: 'Update a task by id',
            },
            {
                url: '/tasks/:taskId',
                method: 'delete',
                handler: TaskController.deleteTask,
                validator: 'deleteTask',
                description: 'Delete a task by id',
            },
            // Task specific routes
            {
                url: '/tasks/:taskId/status',
                method: 'put',
                handler: TaskController.updateTaskStatus,
                validator: 'updateTaskStatus',
                description: 'Update a task status by id',
            },
            {
                url: '/tasks/:taskId/progress',
                method: 'put',
                handler: TaskController.updateTaskProgress,
                validator: 'updateTaskProgress',
                description: 'Update a task progress by id',
            },
            {
                url: '/tasks/project/:projectId',
                method: 'get',
                handler: TaskController.getTasksByProject,
                validator: 'getTasksByProject',
                description: 'Get all tasks for a project',
            },
            {
                url: '/tasks/:parentTaskId/subtasks',
                method: 'get',
                handler: TaskController.getSubTasks,
                validator: 'getSubTasks',
                description: 'Get all subtasks for a task',
            },
        ],
        description: 'Task routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            // Project Routes
            {
                url: '/projects',
                method: 'get',
                handler: ProjectController.getProjects,
                description: 'Get all projects',
            },
            {
                url: '/projects/create',
                method: 'post',
                handler: ProjectController.createProject,
                validator: 'createProject',
                description: 'Create a new project',
            },
            {
                url: '/projects/:projectId',
                method: 'get',
                handler: ProjectController.getProject,
                validator: 'getProject',
                description: 'Get a project by id',
            },
            {
                url: '/projects/:projectId',
                method: 'put',
                handler: ProjectController.updateProject,
                validator: 'updateProject',
                description: 'Update a project by id',
            },
            {
                url: '/projects/:projectId',
                method: 'delete',
                handler: ProjectController.deleteProject,
                validator: 'deleteProject',
                description: 'Delete a project by id',
            },
            // Project specific routes
            {
                url: '/projects/:projectId/tasks',
                method: 'get',
                handler: ProjectController.getProjectTasks,
                validator: 'getProjectTasks',
                description: 'Get all tasks for a project',
            },
            {
                url: '/projects/:projectId/statistics',
                method: 'get',
                handler: ProjectController.getProjectStatistics,
                validator: 'getProjectStatistics',
                description: 'Get statistics for a project',
            },
            {
                url: '/projects/:projectId/archive',
                method: 'put',
                handler: ProjectController.archiveProject,
                validator: 'archiveProject',
                description: 'Archive a project by id',
            },
        ],
        description: 'Project routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            // Push Subscription Routes
            {
                url: '/push-subscriptions',
                method: 'get',
                handler: PushSubscriptionController.getSubscriptions,
            },
            {
                url: '/push-subscriptions',
                method: 'post',
                handler: PushSubscriptionController.createSubscription,
                validator: 'createPushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'get',
                handler: PushSubscriptionController.getSubscription,
                validator: 'getPushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'put',
                handler: PushSubscriptionController.updateSubscription,
                validator: 'updatePushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'delete',
                handler: PushSubscriptionController.deleteSubscription,
                validator: 'deletePushSubscription',
            },
            // Push Subscription specific routes
            {
                url: '/push-subscriptions/:subscriptionId/logs',
                method: 'get',
                handler: PushSubscriptionController.getSubscriptionLogs,
                validator: 'getPushSubscriptionLogs',
            },
            {
                url: '/push-subscriptions/:subscriptionId/statistics',
                method: 'get',
                handler: PushSubscriptionController.getSubscriptionStatistics,
                validator: 'getPushSubscriptionStatistics',
            },
            {
                url: '/push-subscriptions/:subscriptionId/deactivate',
                method: 'put',
                handler: PushSubscriptionController.deactivateSubscription,
                validator: 'deactivatePushSubscription',
            },
        ],
        description: 'Push Subscription routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
];
