import uWS from 'uWebSockets.js';
import configApp  from '../config/app.js'
import state from "../state/state.js";
import { onMessage, onOpen, onClose, handleUpgrade } from "../services/wsHandler.js";
import logger from "../logger.js";
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
    server.get('/',(res, req)=>{
        if (state.listenSocket) {

        } else {

            logger.warn('We just refuse if already shutting down')
            res.close();
        }
    })
}
const init = () => {
    process.title = configApp.appName;

    const server = uWS.App();
    configureWebsockets(server)
    configureHttp(server)
    server.listen(configApp.port, (token) => {
        if (token) {
            logger.info('Listening to port ' + configApp.port);
            state.listenSocket = token
        } else {
            logger.info('Failed to listen to port ' + configApp.port);
        }
    });
    process.on('SIGINT', () => stop('SIGINT'));
    process.on('SIGHUP', () => stop('SIGHUP'));
    process.on('SIGTERM', () => stop('SIGTERM'));

    process.on('uncaughtException', (err, origin)=> {
        logger.error('event uncaughtException')
        console.error(err)
        stop('uncaughtException')
    });
}

const stop = (type='handle') => {
    logger.info('server stop type: '+ type)
    

    uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null
}

export { init }
