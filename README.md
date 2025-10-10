
# uWebSockets API

`uWebSockets-api` — This wrapper simplifies the usage of [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) by offering more convenient tools for handling WebSockets and HTTP routing.Supports Node 22 versions.

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
        group: [
            {
                url: '/register',
                method: 'post',
                handler: AuthController.register,
                validator: 'register',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,             
                },
                description: 'Register a new user',
            },
            {
                url: '/login',
                method: 'post',
                handler: AuthController.login,
                validator: 'login',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,             
                },
                description: 'Login a user',
            },
            {
                url: '/logout',
                method: 'post',
                handler: AuthController.logout,
                description: 'Logout a user',
            },
        ],
        description: 'Auth routes',
        middlewares: ['session_web'],
        prefix: 'api/auth',
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,             
        },
    },
];

```

routing ws `app/routes/wsRoutes.ts`

```ts
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
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 600, // Max 600 requests per minute for the whole group
    },
  },
];


```
http controller `app/controllers/http/AuthController.ts`
```ts
import logger from '#logger';
import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';

export default {
    async register(context: HttpContext) {
        logger.info('register handler');
        const { httpData, auth, session } = context;
        const {name , email , password} = httpData.payload;
        const hash = await hashPassword(password);

        const user = await User.create({
            name: name,
            email: email,
            password: hash,
        });
        await session.destroySession()
        const res = await auth.login(user);
        return { status: (res ? 'success':'error'), user: User.serialize(user) };

    },
    async login(context: HttpContext){
        logger.info('login handler');
        const { httpData, responseData, auth } = context;
        const { email , password } = httpData.payload;
        const user = await User.query()
            .where('email','=', email)
            .first();
        if(user){
            const valid = await validatePassword(password, user.password);
            if (valid) {
                const res = await auth.login(user);
                return { status: (res ? 'success':'error'), user: User.serialize(user) };
            }
        }
        responseData.status = 401;
        return 'unauthorized';
    },
    async logout(context: HttpContext){
        logger.info('logout handler');
        const { auth } = context;
        const res = await auth.logout();
        return { status: (res ? 'success':'error')}
    }
}
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
    async testSession({ session, httpData }: HttpContext): Promise<any> {
        logger.info('testSession');
        logger.info(session);
        const cookies: any[] = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value});
        });
        const sessionInfo = session?.sessionInfo;

        return { status: 'ok' , cookies , sessionInfo };
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

## Route Configuration

### Route Fields

Each route can be configured with the following fields:

- **`url`** - The route path (required)
- **`method`** - HTTP method for HTTP routes (required for HTTP routes)
- **`handler`** - Controller method to handle the request (required)
- **`validator`** - Validation schema name (optional)
- **`middleware`** - Single middleware for WebSocket routes (optional)
- **`middlewares`** - Array of middlewares for HTTP routes (optional)
- **`description`** - Human-readable description of the route (optional)
- **`rateLimit`** - Rate limiting configuration (optional)

### Rate Limiting

Rate limiting can be configured at both route and group levels:

```ts
{
  url: '/api/endpoint',
  method: 'post',
  handler: Controller.method,
  rateLimit: {
    windowMs: 1 * 60 * 1000, // Time window in milliseconds
    maxRequests: 10,          // Maximum requests per window
  },
}
```

**Rate Limit Fields:**
- **`windowMs`** - Time window in milliseconds
- **`maxRequests`** - Maximum number of requests allowed in the time window

### Route Groups

Route groups support additional configuration:

- **`prefix`** - URL prefix for all routes in the group
- **`middlewares`** - Middlewares applied to all routes in the group
- **`description`** - Description for the entire group
- **`rateLimit`** - Rate limiting applied to all routes in the group

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
