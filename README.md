🇺🇦 Stand With Ukraine - Support Independence, Resist Russian Aggression 🇺🇦

🇮🇱 Stand With Israel - Support its Fight Against Terrorism 🇮🇱

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
            },
            {
                url: '/login',
                method: 'post',
                handler: AuthController.login,
                validator: 'login',
            },
            {
                url: '/logout',
                method: 'post',
                handler: AuthController.logout,
                validator: 'login',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'auth',
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
