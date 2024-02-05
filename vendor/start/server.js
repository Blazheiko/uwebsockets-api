import uWS from 'uWebSockets.js';
import qs from 'qs';
import configApp from '#config/app.js';
import state from '#app/state/state.js';
import {
    onMessage,
    onOpen,
    onClose,
    handleUpgrade,
} from '#app/services/wsHandler.js';
import {
    getHeaders,
    readJson,
    extractParameters,
    normalizePath,
} from './httpRequestHandlers.js';
import logger from '#logger';
import db from '#database/db.js';
import { getGetRoutes, getPostRoutes } from "./router.js";

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
};

const setHttpHandler = async (res, req, method, route) => {
    logger.info('Handler method:' + method);
    if (state.listenSocket) {
        try {
            const contentType = req.getHeader('content-type').trim();
            const isJson =
                method === 'post' &&
                contentType.toLowerCase() === 'application/json';
            const httpData = Object.freeze({
                params: extractParameters(route.url, req.getUrl()),
                query: qs.parse(req.getQuery()),
                payload: isJson ? await readJson(res) : null,
                headers: getHeaders(req),
                contentType,
                isJson,
            });
            const responseData = {
                payload: {},
                headers: [],
                status: '200',
            };
            const result = await route.handler(httpData, responseData );
            if (!res.aborted) {
                res.cork(() => {
                    if (isJson)
                        res.writeHeader('content-type', 'application/json');
                    if (result?.headers?.length) {
                        result.headers.forEach((header) => {
                            res.writeHeader(header[0], header[1]);
                        });
                    }
                    res.writeStatus(result.status).end(
                        JSON.stringify(result.payload),
                    );
                });
            }
        } catch (e) {
            logger.error(e)
            res.cork(() => {
                res.writeStatus('500').end('Server error');
            });
        }
    } else {
        logger.warn('We just refuse if already shutting down');
        res.close();
    }
};
const configureHttp = (server) => {
    logger.info('configureHttp get');
    getGetRoutes().forEach((route) => {
        server.get(`/${normalizePath(route.url)}`, async (res, req) => {
            await setHttpHandler(res, req, 'get', route);
        });
    });
    logger.info('configureHttp post');
    getPostRoutes().forEach((route) => {
        server.post(`/${normalizePath(route.url)}`, async (res, req) => {
            await setHttpHandler(res, req, 'post', route);
        });
    });
    server.any('/*', (res, req) => {
        res.cork(() => {

            res.writeStatus('404');
            res.end('404 error');
        });

    });
};
const init = () => {

    const server = uWS.App();
    configureWebsockets(server);
    configureHttp(server);
    server.listen(configApp.port, (token) => {
        if (token) {
            logger.info('Listening to port ' + configApp.port);
            state.listenSocket = token;
        } else {
            logger.info('Failed to listen to port ' + configApp.port);
        }
    });
    /* eslint-disable no-undef */
};

const stop = (type = 'handle') => {
    logger.info('server stop type: ' + type);

    uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null;
    db.destroy().then(() => {
        logger.info('db connection destroy');
    });
};

export { init, stop };
