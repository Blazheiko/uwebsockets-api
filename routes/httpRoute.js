import configApp from '../config/app.js';
export default {
  get: [
    {
      url: '/',
      handler: (httpData, responseData) => {
        responseData.payload = httpData;
        return responseData;
      },
      middleware: [],
    },
    {
      url: '/token/:token/user/:userId',
      handler: (httpData, responseData) => {
        responseData.payload = httpData;
        return responseData;
      },
      middleware: [],
    },
    {
      url: '/get-config',
      handler: (httpData, responseData) => {
        responseData.payload = configApp;
        return responseData;
      },
      middleware: [],
    },
  ],
  post: [
    {
      url: '/',
      handler: (httpData, responseData) => {
        return responseData;
      },
      middleware: [],
    },
  ],
};
