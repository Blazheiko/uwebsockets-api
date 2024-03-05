# uWebSockets API

`uWebSockets-api` — This wrapper simplifies the usage of [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) by offering more convenient tools for handling WebSockets and HTTP routing.

## Basics

This wrapper simplifies the usage of `uWebSockets.js` by offering more convenient tools for handling WebSockets and HTTP routing.

## Installation

You can install `uWebSockets-api` clone project https://github.com/Blazheiko/uwebsockets-api.git

## Usage Example

Inspired by the frameworks `Laravel` and `AdonisJs`, `uWebSockets-api` aims to provide a similar experience in organizing project structure and route descriptions.

Create .env file following the .env.example

routing http `app/routes/httpRoutes.js`

```js
import { router } from '#vendor/start/router.js';
import MainController from '#app/controllers/http/MainController.js';
import logger from '#logger';

router.get('/', (httpData, responseData) => {
  responseData.payload = httpData;
  return responseData;
});
router.group([
  router.get('/init', MainController.init),
  router.post('/save-user', MainController.saveUser).validate('register'),
  router.get('/token/:token', (httpData, responseData) => {
    responseData.payload = { test: 'test payload' };
    return responseData;
  }),
])
  .middleware(['test2'])
  .prefix('/api');

```

routing ws `app/routes/wsRoutes.js`

```js
import { router } from '#vendor/start/router.js';
import WSApiController from '#app/controllers/ws/WSApiController.js';

router.group([
  router.ws('test', WSApiController.test),
  router.ws('error', WSApiController.error),
])
  .prefix('message:');

```

## Modules used

Query Builder `database/db.js` [khex](https://knexjs.org/guide/)

Redis client `database/redis.js` [ioredis](https://github.com/redis/ioredis)

Validator `app/validate/schemas/schemas.js` [VineJS](https://vinejs.dev/docs/introduction)

Logger `logger.js` [pino](https://github.com/pinojs/pino)

Library for working with dates and times [Luxon](https://github.com/moment/luxon#readme)

Utils [Metarhia utilities](https://github.com/metarhia/metautil)

## License

`uWebSockets-api` is released under the MIT License.

## Support and Contribution

If you have questions or suggestions, please create an issue in our GitHub repository. We also welcome your pull requests with improvements and corrections.
