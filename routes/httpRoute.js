export default {
    get: [
        {
            url: '/',
            handler: ( httpData ) => httpData,
            middleware: []
        },
        {
            url: '/token/:token/user/:userId',
            handler: ( httpData ) => httpData,
            middleware: []
        },
    ],
    post: [
        {
            url: '/',
            handler: null,
            middleware: []
        }

    ]
}
