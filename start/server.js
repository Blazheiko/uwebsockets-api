import uWS from 'uWebSockets.js';
import configApp  from 'config/app'
import {onMessage, onOpen, onClose, handleUpgrade, handleDrain} from "../services/wsHandler";
const configureWebsockets = (server) => {
    return server.ws('/app/:id', {
        idleTimeout: 120, // According to protocol
        maxBackpressure: 1024 * 1024,
        maxPayloadLength: 100 * 1024 * 1024, // 100 MB
        open: (ws) => onOpen(ws),
        message: (ws, message, isBinary) => onMessage(ws, message, isBinary),
        upgrade: (res, req, context) => handleUpgrade(res, req, context),
        drain: (ws) => handleDrain(ws),
        close: (ws, code, message) => onClose(ws, code, message),
    });
}
const configureHttp = (server) => {

}
const init = () => {
    const server = uWS.App();
    const wsServer = configureWebsockets(server)
    const httpServer = configureHttp(server)
    server.listen(configApp.port, (token) => {
        if (token) {
            console.log('Listening to port ' + configApp.port);
        } else {
            console.log('Failed to listen to port ' + configApp.port);
        }
    });
}

