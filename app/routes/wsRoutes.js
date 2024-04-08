import WSApiController from '#app/controllers/ws/WSApiController.js';

export default [
    {
        url: 'api:test1',
        handler: WSApiController.test,
    },
    {
        group: [
            {
                url: 'test',
                handler: WSApiController.test,
            },
            {
                url: 'error',
                handler: WSApiController.error,
                middleware: 'test2',
            },
            {
                url: 'save-user',
                handler: WSApiController.saveUser,
                validator: 'register',
            },
        ],
        prefix: 'api:',
    },
];
