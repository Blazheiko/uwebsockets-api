import pino from 'pino';
import appConfig from '#config/app.js';

// @ts-ignore
const logger: any =
    appConfig.env === 'prod' || appConfig.env === 'production'
        ? // @ts-ignore
          pino({
              serializers: {
                  bigint: (value: any) => value.toString(),
              },
          })
        : // @ts-ignore
          pino({
              serializers: {
                  bigint: (value: any) => value.toString(),
              },
              transport: {
                  target: 'pino-pretty',
              },
              options: {
                  colorize: true,
              },
          });

export default logger;
