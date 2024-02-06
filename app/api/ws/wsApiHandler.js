import logger from '#logger';

const wsApiHandlers = {
    'api:get-user': ['handler', ['middlewares']],
};

export default async (message) => {
    try {
        if (wsApiHandlers[message.event]) {
            const middlewares = wsApiHandlers[message.event][1];
            if (middlewares && middlewares.length) {
                // handle middlewares
            }
            const handler = wsApiHandlers[message.event][0];
            return await handler(message);
        }
    } catch (e) {
        logger.info('error wsApiHandler');
    }

    return null;
};
