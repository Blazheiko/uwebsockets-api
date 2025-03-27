import MainController from '#app/controllers/http/MainController.js';
import AuthController from '../controllers/http/AuthController.js';
import ChatListController from '../controllers/http/ChatListController.js';
import MessageController from '../controllers/http/MessageController.js';
import { InvitationController } from '../controllers/http/InvitationController.js';

export default [
    // {
    //     url: '/',
    //     method: 'get',
    //     handler: MainController.ping,
    // },
    {
        url: '/save-user',
        method: 'post',
        handler: MainController.saveUser,
    },
    {
        url: '/test-middleware',
        method: 'get',
        handler: MainController.testMiddleware,
        middlewares: ['test1'],
    },
    {
        url: '/test-api-session',
        method: 'get',
        handler: MainController.testApiSession,
        middlewares: ['session_api'],
    },
    {
        url: '/test-params/:id/:name',
        method: 'get',
        handler: MainController.testParams,
        middlewares: ['test1'],
    },
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
                url: '/chats',
                method: 'get',
                handler: ChatListController.getChatList,
                middlewares: ['session_web'],
            },
            {
                url: '/chats',
                method: 'post',
                handler: ChatListController.createChat,
                middlewares: ['session_web'],
                validator: 'createChat',
            },
            {
                url: '/chats/:chatId',
                method: 'delete',
                handler: ChatListController.deleteChat,
                middlewares: ['session_web'],
                validator: 'deleteChat',
            },
            // Message Routes
            {
                url: '/messages/:contactId',
                method: 'get',
                handler: MessageController.getMessages,
                middlewares: ['session_web'],
                validator: 'getMessages',
            },
            {
                url: '/messages',
                method: 'post',
                handler: MessageController.sendMessage,
                middlewares: ['session_web'],
                validator: 'sendMessage',
            },
            {
                url: '/messages/:messageId',
                method: 'delete',
                handler: MessageController.deleteMessage,
                middlewares: ['session_web'],
                validator: 'deleteMessage',
            },
            {
                url: '/messages/:messageId',
                method: 'put',
                handler: MessageController.editMessage,
                middlewares: ['session_web'],
                validator: 'editMessage',
            },
            {
                url: '/messages/:messageId/read',
                method: 'put',
                handler: MessageController.markAsRead,
                middlewares: ['session_web'],
                validator: 'markMessageAsRead',
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
            // Invitation Routes
            {
                url: '/invitations',
                method: 'post',
                handler: InvitationController.createInvitation,
                middlewares: ['session_web'],
                validator: 'createInvitation',
            },
            {
                url: '/invitations/user/:userId',
                method: 'get',
                handler: InvitationController.getUserInvitations,
                middlewares: ['session_web'],
                validator: 'getUserInvitations',
            },
            {
                url: '/invitations/use/:token',
                method: 'post',
                handler: InvitationController.useInvitation,
                middlewares: ['session_web'],
                validator: 'useInvitation',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api',
    },
];
