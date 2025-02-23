🇺🇦 Stand With Ukraine - Support Independence, Resist Russian Aggression 🇺🇦

🇮🇱 Stand With Israel - Support its Fight Against Terrorism 🇮🇱

# uWebSockets API

`uWebSockets-api` — This wrapper simplifies the usage of [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) by offering more convenient tools for handling WebSockets and HTTP routing.

## Basics

This wrapper simplifies the usage of `uWebSockets.js` by offering more convenient tools for handling WebSockets and HTTP routing.

## Installation

You can install `uWebSockets-api` clone project https://github.com/Blazheiko/uwebsockets-api.git

Install dependencies `npm install`

Create `.env` file following the `.env.example`

Start server `npm run start`

Starting the server in development mode  `npm run dev`

## Usage Example

Inspired by the frameworks `Laravel` and `AdonisJs`, `uWebSockets-api` aims to provide a similar experience in organizing project structure and route descriptions.


routing http `app/routes/httpRoutes.ts`

```ts
import MainController from '#app/controllers/http/MainController.ts';

export default [
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
    ],
    middlewares: ['test2'],
    prefix: '/api',
  },
];

```

routing ws `app/routes/wsRoutes.ts`

```ts
import WSApiController from '#app/controllers/ws/WSApiController.js';

export default [
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


```
http controller `app/controllers/http/MainController.ts`

```ts
import { HttpContext, HttpData, ResponseData } from './../../../vendor/types/types.js';

export default {
    async setHeaderAndCookie({ responseData }: HttpContext): Promise<any> {
        logger.info('set-header-and-cookie');
        responseData.headers.push({ name: 'test-header', value: 'test' });
        responseData.cookies.push({
            name: 'cookieTest',
            value: 'test',
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 3600,
        });
        responseData.setCookie('cookieTest', 'test');
        return { status: 'ok' };
    },
}
```

ws controller `app/controllers/ws/WSApiController.ts`

```ts
import logger from '#logger';
import User from '#app/models/User.js';
import { WsContext, WsData, WsResponseData } from '../../../vendor/types/types.js';

export default {
    test({ responseData}: WsContext) {
        logger.info('ws test');
        responseData.payload = { test: true };

        return responseData;
    },
    async saveUser({ wsData, responseData}: WsContext) {
        logger.info('ws saveUser');
        const { payload } = wsData;
        console.log({ payload });
        const user = await User.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });
       
        responseData.payload = { status: 'ok', user };

        return responseData;
    },
};
```

## Modules used

Query Builder `database/db.ts` [khex](https://knexjs.org/guide/)

Redis client `database/redis.ts` [ioredis](https://github.com/redis/ioredis)

Validator `app/validate/schemas/schemas.ts` [VineJS](https://vinejs.dev/docs/introduction)

Logger `logger.ts` [pino](https://github.com/pinojs/pino)

Library for working with dates and times [Luxon](https://github.com/moment/luxon#readme)

Utils [Metarhia utilities](https://github.com/metarhia/metautil)

## License

`uWebSockets-api` is released under the MIT License.

## Support and Contribution

If you have questions or suggestions, please create an issue in our GitHub repository. We also welcome your pull requests with improvements and corrections.
