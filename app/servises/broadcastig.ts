import logger from "#logger";
import { broadcastMessage, broadcastToChannel } from "#vendor/start/server.js";
import { makeBroadcastJson } from "#vendor/utils/helpers/json-handlers.js";
import { getUserConnections } from "#vendor/utils/network/ws-handlers.js";
export default {
    broadcastMessageToUser(userId: number, event: string, payload: any) {
        logger.info(`broadcastMessageToUser: ${userId} ${event}`);
        let counter = 0;
        const userConnections = getUserConnections(String(userId));
        if (userConnections) {
            for (const userConnection of userConnections.values()) {
                if (userConnection?.connection) {
                    try {
                        const result = userConnection?.connection.send( makeBroadcastJson(event, 200, payload) );
                        if (result === 1) counter++;
                        
                    } catch (error) {
                        logger.error({ err: error }, `Error sending message to user ${userId}`);
                    }
                }
            }
        }else{
            logger.error(`No user connections found for user ${userId}`);
        }
        return counter;
    },
    broadcastMessageToChannel(channel: string, event: string, payload: any) {
        logger.info(`broadcastMessageToChannel: ${channel} ${event}`);
        broadcastToChannel(channel, event, payload);
    },
}