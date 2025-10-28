import logger from "#logger";

export default {
    onUserConnected(event: any) {
        logger.info(`ws event: User ${event.userId} connected`);
    },
    onUserDisconnected(event: any) {
        logger.info(`ws event: User ${event.userId} disconnected`);
    },
};