import MainController from '#app/controllers/http/MainController.js';

export default [
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
        group: [
            {
                url: '/init',
                method: 'get',
                handler: MainController.init,
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
                handler: MainController.setHeaderAndCookie,
                middlewares: ['test1'],
            },
        ],
        middlewares: ['test2'],
        prefix: '/api',
    },
];
