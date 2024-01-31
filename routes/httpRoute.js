import configApp  from '../config/app.js'
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
        {
            url: '/get-config',
            handler: ( httpData ) => configApp,
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
