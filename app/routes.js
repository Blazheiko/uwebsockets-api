import { router } from '#start/router.js';

export default () => {
    router.get('/',( httpData, responseData ) => {
        responseData.payload = httpData;
        return responseData;
    });
    router.group([
        router.get('/token/:token',( httpData, responseData ) => {
            responseData.payload = httpData;
            return responseData;
        })
    ]).prefix('/api')

}



// import configApp from '#config/app.js';
// export default {
//     get: [
//         {
//             url: '/',
//             handler: (httpData, responseData) => {
//                 responseData.payload = httpData;
//                 return responseData;
//             },
//             middleware: [],
//             validator: 'register'
//         },
//         {
//             url: '/token/:token',
//             handler: (httpData, responseData) => {
//                 responseData.payload = httpData;
//                 return responseData;
//             },
//             middleware: [],
//         },
//         {
//             url: '/get-config',
//             handler: (httpData, responseData) => {
//                 responseData.payload = configApp;
//                 return responseData;
//             },
//             middleware: [],
//         },
//     ],
//     post: [
//         {
//             url: '/',
//             handler: (httpData, responseData) => {
//                 return responseData;
//             },
//             middleware: [],
//         },
//     ],
// };
