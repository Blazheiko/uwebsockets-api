import logger from "#logger";
import broadcastService from "#app/servises/broadcastig.js";
import { WebSocketConnectionEvent, WebSocketDisconnectionEvent } from '../../../vendor/types/types.js';;

export default {
    onUserConnected(event: WebSocketConnectionEvent) {
        logger.info(`ws event: User ${event.userId} connected`);
        if (event.ws) {
            event.ws.subscribe(`change_online`);
        }
        if (event.userId) {
            broadcastService.broadcastOnline(event.userId, 'online');
        }
    },
    onUserDisconnected(event: WebSocketDisconnectionEvent) {
        logger.info(`ws event: User ${event.userId} disconnected`);
        if (event.userId) {
            broadcastService.broadcastOnline(event.userId, 'offline');
        }
    },
};