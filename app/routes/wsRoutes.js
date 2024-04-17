import WSApiController from '#app/controllers/ws/WSApiController.js';

export default [
    {
        group: [
            {
                url: 'test',
                handler: WSApiController.test,
                description: '',
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
