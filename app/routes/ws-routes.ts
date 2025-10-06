import WSApiController from '#app/controllers/ws/ws-api-controller.js';

export default [
    {
        group: [
            {
                url: 'event_typing',
                handler: WSApiController.eventTyping,
                description: 'Handle typing events',
                rateLimit: {
                    windowMs: 1 * 60 * 1000, // 1 minute
                    maxRequests: 30,  // Max 30 typing events per minute
                },
            },
            {
                url: 'error',
                handler: WSApiController.error,
                middleware: 'test2',
                description: 'Error handling test',
            },
            {
                url: 'save-user',
                handler: WSApiController.saveUser,
                validator: 'register',
                description: 'Save user data',
                rateLimit: {
                    windowMs: 5 * 60 * 1000, // 5 minutes
                    maxRequests: 5, // Max 5 user save operations per 5 minutes
                },
            },
        ],
        prefix: 'api:',
        rateLimit: {
            windowMs: 1 * 60 * 1000, // 15 minutes
            maxRequests: 600, // Max 100 requests per 15 minutes for the whole group
        },
    },
];
