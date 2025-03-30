import MainController from '#app/controllers/http/MainController.js';
import AuthController from '../controllers/http/AuthController.js';
import ChatListController from '../controllers/http/ChatListController.js';
import MessageController from '../controllers/http/MessageController.js';
import InvitationController from '../controllers/http/InvitationController.js';

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
                url: '/messages/:contactId',
                method: 'get',
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

];
