import uWS from 'uWebSockets.js';
import qs from 'qs';
import appConfig from '#config/app.js';
import corsConfig from '#config/cors.js';
import cookiesConfig from '#config/cookies.js';
import state from '#app/state/state.js';
import {
    onMessage,
    onOpen,
    onClose,
    handleUpgrade,
    closeAllWs,
} from '#vendor/start/wsHandler.js';
import {
    getHeaders,
    readJson,
    extractParameters,
    normalizePath,
} from '../httpRequestHandlers.js';
import logger from '#logger';
import { getListRoutes } from './router.js';

import validators from '#vendor/start/validators.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';

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

const parseCookies = (cookieHeader) => {
    let list = {};

    if (cookieHeader) {
        cookieHeader.split(';').forEach((cookie) => {
            let [key, value] = cookie.split('=').map((part) => part.trim());
            if (value) {
                try {
                    list[key] = decodeURIComponent(value);
                } catch (e) {
                    logger.error(
                        'Error decodeURIComponent for cookie value: ' + value,
                    );
                }
            }
        });
    }

    return list;
};

/*  example responseData.cookies
|[
|  {
|      name: 'cookieOne',
|      value: 'valueOne',
|      path: '/',
|      httpOnly: true,
|      secure: true,
|      expires:
|      maxAge: 3600, // Max-Age in seconds
|   },
|]
 */
const setCookies = (res, cookies) => {
    cookies.forEach((cookie) => {
        let parts = [];
        parts.push(`${cookie.name}=${encodeURIComponent(cookie.value)}`);
        if (cookie.path) parts.push(`Path=${cookie.path}`);
        if (cookie.expires)
            parts.push(`Expires=${cookie.expires.toUTCString()}`);
        if (cookie.httpOnly) parts.push('HttpOnly');
        if (cookie.secure) parts.push('Secure');
        if (cookie.maxAge) parts.push(`Max-Age=${cookie.maxAge}`);
        if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
        const cookieString = parts.join('; ');
        res.writeHeader('Set-Cookie', cookieString);
    });
};

const setHeaders = (res, headers) => {
    headers.forEach((header) => {
        res.writeHeader(header.name, header.value);
    });
};
const getResponseData = () => {
    const cookies = [];
    const headers = [];
    const setCookie = (name, value, options = {}) =>
        cookies.push({
            name,
            value,
            path: options?.path ? options.path : cookiesConfig.default.path,
            httpOnly: options?.httpOnly
                ? options.httpOnly
                : cookiesConfig.default.httpOnly,
            secure: options?.secure
                ? options.secure
                : cookiesConfig.default.secure,
            maxAge: options?.maxAge
                ? options.maxAge
                : cookiesConfig.default.maxAge,
        });
    const setHeader = (name, value) => headers.push({ name, value });

    return {
        aborted: false,
        payload: {},
        middlewareData: {},
        headers,
        cookies,
        status: 200,
        setCookie,
        setHeader,
    };
};

const getHttpData = async (req, res, route) => {
    const cookies = parseCookies(req.getHeader('cookie'));
    const contentType = req.getHeader('content-type').trim();
    const url = req.getUrl();
    const query = qs.parse(req.getQuery());
    const headers = getHeaders(req);
    const isJson =
        route.method === 'post' &&
        contentType.toLowerCase() === 'application/json';
    let payload = null;
    if (isJson) {
        payload = await readJson(res);
        if (route.validator) {
            // logger.info('validator: ' + route.validator);
            const validator = validators[route.validator];
            if (validator) payload = await validator.validate(payload);
        }
    }
    return Object.freeze({
        params: extractParameters(route.url, url),
        payload,
        query,
        headers,
        contentType,
        cookies,
        isJson,
    });
};
const setHttpHandler = async (res, req, route) => {
    // logger.info('Handler method:' + method);
    if (state.listenSocket) {
        try {
            let aborted = false;
            res.onAborted(() => {
                aborted = true;
            });
            const httpData = await getHttpData(req, res, route);
            const responseData = getResponseData();
            await executeMiddlewares(route, httpData, responseData);
            responseData.payload = await route.handler(httpData, responseData);
            if (aborted) return;
            res.cork(() => {
                res.writeStatus(`${responseData.status}`);
                if (httpData.isJson)
                    res.writeHeader('content-type', 'application/json');
                if (responseData.headers?.length)
                    setHeaders(res, responseData.headers);
                if (responseData.cookies?.length)
                    setCookies(res, responseData.cookies);
                if (corsConfig.enabled) setCorsHeader(res);
                res.end(JSON.stringify(responseData.payload));
            });
        } catch (e) {
            res.cork(() => {
                if (e.code === 'E_VALIDATION_ERROR') {
                    // logger.error('E_VALIDATION_ERROR');
                    res.writeStatus('422').end(
                        JSON.stringify({
                            message: 'Validation failure',
                            messages: e.messages,
                        }),
                    );
                } else {
                    res.writeStatus('500').end('Server error');
                }
            });
        }
    } else {
        logger.warn('We just refuse if already shutting down');
        res.close();
    }
};
const configureHttp = (server) => {
    logger.info('configureHttp get');
    // console.log(getGetRoutes());
    getListRoutes().forEach((route) => {
        // console.log(route);
        server[route.method](
            `/${normalizePath(route.url)}`,
            async (res, req) => {
                await setHttpHandler(res, req, route);
            },
        );
    });

    server.any('/*', (res, req) => {
        if (corsConfig.enabled && req.getMethod() === 'options') {
            //'OPTIONS' method === 'OPTIONS'
            res.cork(() => {
                setCorsHeader(res);
                res.writeStatus('200').end();
            });
        } else {
            res.cork(() => {
                let data = '404 Not Found';
                let statusCode = '404';
                res.writeStatus(statusCode);
                res.end(data);
            });
        }
    });
};

const setCorsHeader = (res) => {
    res.writeHeader('Access-Control-Allow-Origin', corsConfig.origin);
    res.writeHeader('Access-Control-Allow-Methods', corsConfig.methods);
    res.writeHeader('Access-Control-Max-Age', `${corsConfig.maxAge}`);
    res.writeHeader(
        'Access-Control-Expose-Headers',
        `${corsConfig.exposeHeaders}`,
    );
    res.writeHeader('Access-Control-Allow-Headers', corsConfig.allowHeaders);
    if (corsConfig.credentials) {
        res.writeHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (corsConfig.headers) {
        //TODO
        // const reqHeaders = req.getHeader('access-control-request-headers');
        // res.writeHeader('Access-Control-Allow-Headers', reqHeaders);
    }
};
// let server = null;
const init = () => {
    const server = uWS.App();
    configureWebsockets(server);
    configureHttp(server);
    server.listen(appConfig.port, (token) => {
        if (token) {
            logger.info('Listening to port ' + appConfig.port);
            state.listenSocket = token;
        } else {
            logger.info('Failed to listen to port ' + appConfig.port);
        }
    });
    /* eslint-disable no-undef */
};

const stop = (type = 'handle') => {
    logger.info('server stop type: ' + type);
    closeAllWs();
    uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null;
};

export { init, stop };
