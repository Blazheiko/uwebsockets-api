import { wsEventEmitter} from '#vendor/utils/events/ws-event-manager.js';
import wsEventHandler from '#app/events/ws-events/ws-event-handler.js';

wsEventEmitter.on('user_connected', (event: any) => {
        wsEventHandler.onUserConnected(event);
    });

wsEventEmitter.on('user_disconnected', (event: any) => {
    wsEventHandler.onUserDisconnected(event);
});

