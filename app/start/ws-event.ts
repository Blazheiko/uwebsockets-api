import { wsEventEmitter} from '#vendor/utils/events/ws-event-manager.js';
import logger from '#logger';

wsEventEmitter.on('user_connected', (data: any) => {
        logger.info(`ws event: User ${data.userId} connected`);
    });

wsEventEmitter.on('user_disconnected', (data: any) => {
    logger.info(`ws event: User ${data.userId} disconnected`);
});

