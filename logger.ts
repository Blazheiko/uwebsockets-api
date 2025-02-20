import pino from 'pino';
import appConfig from '#config/app.js';

// @ts-ignore
const logger: any =
    appConfig.env === 'prod' || appConfig.env === 'production'
        // @ts-ignore
        ? pino()
        // @ts-ignore
        : pino({
              transport: {
                  target: 'pino-pretty',
              },
              options: {
                  colorize: true,
              },
          });

export default logger;
