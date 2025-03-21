import MainController from '#app/controllers/http/MainController.js';
import AuthController from '../controllers/http/AuthController.js';

export default [
    {
        url: '/',
        method: 'get',
        handler: MainController.ping,
    },
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
                validator: 'login',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'auth',
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
        middlewares: ['session_web','test2'],
        prefix: 'api',
    },
];
