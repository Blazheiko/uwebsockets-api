import MainController from '#app/controllers/http/MainController.js';
import AuthController from '#app/controllers/http/AuthController.js';
import ChatListController from '#app/controllers/http/ChatListController.js';
import MessageController from '#app/controllers/http/MessageController.js';
import InvitationController from '#app/controllers/http/InvitationController.js';
import NotesController from '#app/controllers/http/NotesController.js';
import CalendarController from '#app/controllers/http/CalendarController.js';
import TaskController from '#app/controllers/http/TaskController.js';
import ProjectController from '#app/controllers/http/ProjectController.js';

export default [
    // {
    //     url: '/',
    //     method: 'get',
    //     handler: MainController.ping,
    // },
    // {
    //     url: '/save-user',
    //     method: 'post',
    //     handler: MainController.saveUser,
    // },
    // {
    //     url: '/test-middleware',
    //     method: 'get',
    //     handler: MainController.testMiddleware,
    //     middlewares: ['test1'],
    // },
    // {
    //     url: '/test-api-session',
    //     method: 'get',
    //     handler: MainController.testApiSession,
    //     middlewares: ['session_api'],
    // },
    // {
    //     url: '/test-params/:id/:name',
    //     method: 'get',
    //     handler: MainController.testParams,
    //     middlewares: ['test1'],
    // },
    {
        group: [
            {
                url: '/register',
                method: 'post',
                handler: AuthController.register,
                validator: 'register',
            },
            {
                url: '/login',
                method: 'post',
                handler: AuthController.login,
                validator: 'login',
            },
            {
                url: '/logout',
                method: 'post',
                handler: AuthController.logout,
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/auth',
    },
    {
        group: [
            // Chat List Routes
            {
                url: '/get-contact-list',
                method: 'post',
                handler: ChatListController.getContactList,
            },
            {
                url: '/chats',
                method: 'post',
                handler: ChatListController.createChat,
                validator: 'createChat',
            },
            {
                url: '/chats/:chatId',
                method: 'delete',
                handler: ChatListController.deleteChat,
                validator: 'deleteChat',
            },
            // Message Routes
            {
                url: '/get-messages',
                method: 'post',
                handler: MessageController.getMessages,
                validator: 'getMessages',
            },
            {
                url: '/send-chat-messages',
                method: 'post',
                handler: MessageController.sendMessage,
                validator: 'sendMessage',
            },
            {
                url: '/messages/:messageId',
                method: 'delete',
                handler: MessageController.deleteMessage,
                validator: 'deleteMessage',
            },
            {
                url: '/messages/:messageId',
                method: 'put',
                handler: MessageController.editMessage,
                validator: 'editMessage',
            },
            {
                url: '/messages/:messageId/read',
                method: 'put',
                handler: MessageController.markAsRead,
                validator: 'markMessageAsRead',
            },
                // Invitation Routes
            {
                url: '/invitations',
                method: 'post',
                handler: InvitationController.createInvitation,
                validator: 'createInvitation',
            },
            {
                url: '/invitations/user/:userId',
                method: 'get',
                handler: InvitationController.getUserInvitations,
                validator: 'getUserInvitations',
            },
            {
                url: '/invitations/use/:token',
                method: 'post',
                handler: InvitationController.useInvitation,
                validator: 'useInvitation',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/chat',
    },
    {
        group: [
            {
                url: '/init',
                method: 'get',
                handler: MainController.init,
            },
            {
                url: '/test-header',
                method: 'get',
                handler: MainController.testHeaders,
            },
            {
                url: '/test-cookie',
                method: 'get',
                handler: MainController.getSetCookies,
            },
            {
                url: '/test-session',
                method: 'get',
                handler: MainController.testSession,
            },
            {
                url: '/save-user',
                method: 'post',
                handler: MainController.saveUser,
                validator: 'register',
            },
            {
                url: '/set-header-and-cookie',
                method: 'get',
                handler: MainController.setHeaderAndCookie,
            },
            {
                url: '/test-middleware',
                method: 'get',
                handler: MainController.testMiddleware,
                middlewares: ['test1'],
            },
        ],
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
            },
            {
                url: '/notes',
                method: 'post',
                handler: NotesController.createNote,
                validator: 'createNote',
            },
            {
                url: '/notes/:noteId',
                method: 'get',
                handler: NotesController.getNote,
                validator: 'getNote',
            },
            {
                url: '/notes/:noteId',
                method: 'put',
                handler: NotesController.updateNote,
                validator: 'updateNote',
            },
            {
                url: '/notes/:noteId',
                method: 'delete',
                handler: NotesController.deleteNote,
                validator: 'deleteNote',
            },
            // Notes Photo Routes
            {
                url: '/notes/:noteId/photos',
                method: 'post',
                handler: NotesController.addPhoto,
                validator: 'addNotePhoto',
            },
            {
                url: '/notes/:noteId/photos/:photoId',
                method: 'delete',
                handler: NotesController.deletePhoto,
                validator: 'deleteNotePhoto',
            },
        ],
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
            },
            {
                url: '/events',
                method: 'post',
                handler: CalendarController.createEvent,
                validator: 'createEvent',
            },
            {
                url: '/events/:eventId',
                method: 'get',
                handler: CalendarController.getEvent,
                validator: 'getEvent',
            },
            {
                url: '/events/:eventId',
                method: 'put',
                handler: CalendarController.updateEvent,
                validator: 'updateEvent',
            },
            {
                url: '/events/:eventId',
                method: 'delete',
                handler: CalendarController.deleteEvent,
                validator: 'deleteEvent',
            },
            // Calendar specific routes
            {
                url: '/events/date/:date',
                method: 'get',
                handler: CalendarController.getEventsByDate,
                validator: 'getEventsByDate',
            },
            {
                url: '/events/range',
                method: 'post',
                handler: CalendarController.getEventsByRange,
                validator: 'getEventsByRange',
            },
        ],
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
            },
            {
                url: '/tasks',
                method: 'post',
                handler: TaskController.createTask,
                validator: 'createTask',
            },
            {
                url: '/tasks/:taskId',
                method: 'get',
                handler: TaskController.getTask,
                validator: 'getTask',
            },
            {
                url: '/tasks/:taskId',
                method: 'put',
                handler: TaskController.updateTask,
                validator: 'updateTask',
            },
            {
                url: '/tasks/:taskId',
                method: 'delete',
                handler: TaskController.deleteTask,
                validator: 'deleteTask',
            },
            // Task specific routes
            {
                url: '/tasks/:taskId/status',
                method: 'put',
                handler: TaskController.updateTaskStatus,
                validator: 'updateTaskStatus',
            },
            {
                url: '/tasks/:taskId/progress',
                method: 'put',
                handler: TaskController.updateTaskProgress,
                validator: 'updateTaskProgress',
            },
            {
                url: '/tasks/project/:projectId',
                method: 'get',
                handler: TaskController.getTasksByProject,
                validator: 'getTasksByProject',
            },
            {
                url: '/tasks/:parentTaskId/subtasks',
                method: 'get',
                handler: TaskController.getSubTasks,
                validator: 'getSubTasks',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/tasks',
    },
    {
        group: [
            // Project Routes
            {
                url: '/projects',
                method: 'get',
                handler: ProjectController.getProjects,
            },
            {
                url: '/projects',
                method: 'post',
                handler: ProjectController.createProject,
                validator: 'createProject',
            },
            {
                url: '/projects/:projectId',
                method: 'get',
                handler: ProjectController.getProject,
                validator: 'getProject',
            },
            {
                url: '/projects/:projectId',
                method: 'put',
                handler: ProjectController.updateProject,
                validator: 'updateProject',
            },
            {
                url: '/projects/:projectId',
                method: 'delete',
                handler: ProjectController.deleteProject,
                validator: 'deleteProject',
            },
            // Project specific routes
            {
                url: '/projects/:projectId/tasks',
                method: 'get',
                handler: ProjectController.getProjectTasks,
                validator: 'getProjectTasks',
            },
            {
                url: '/projects/:projectId/statistics',
                method: 'get',
                handler: ProjectController.getProjectStatistics,
                validator: 'getProjectStatistics',
            },
            {
                url: '/projects/:projectId/archive',
                method: 'put',
                handler: ProjectController.archiveProject,
                validator: 'archiveProject',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/projects',
    },

];
