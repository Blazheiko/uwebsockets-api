import uWS from 'uWebSockets.js';
import configApp  from '../config/app.js'
import {onMessage, onOpen, onClose, handleUpgrade, handleDrain} from "../services/wsHandler.js";
const configureWebsockets = (server) => {
    return server.ws('/websocket/:token', {
        compression: 0,
        idleTimeout: 120, // According to protocol
        maxBackpressure: 1024 * 1024,
        maxPayloadLength: 100 * 1024 * 1024, // 100 MB
        open: (ws) => onOpen(ws),
        message: (ws, message, isBinary) => onMessage(ws, message, isBinary),
        upgrade: (res, req, context) => handleUpgrade(res, req, context),
        // drain: (ws) => handleDrain(ws),
        close: (ws, code, message) => onClose(ws, code, message),
    });
}
const configureHttp = (server) => {

}
const init = () => {

    const server = uWS.App();
    configureWebsockets(server)
    configureHttp(server)
    server.listen(configApp.port, (token) => {
        if (token) {
            console.log('Listening to port ' + configApp.port);
        } else {
            console.log('Failed to listen to port ' + configApp.port);
        }
    });
}

export { init }
