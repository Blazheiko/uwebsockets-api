import pino from 'pino';
import appConfig from '#config/app.js';

const logger =
    appConfig.env === 'prod' || appConfig.env === 'production'
        ? pino()
        : pino({
              transport: {
                  target: 'pino-pretty',
              },
              options: {
                colorize: true
              }
          });

export default logger;
