import process from 'node:process';
import uWS from 'uWebSockets.js';
import path from 'node:path';
import qs from 'qs';
import appConfig from '#config/app.js';
import corsConfig from '#config/cors.js';
import state from '#app/state/state.js';
import {
    onMessage,
    onOpen,
    onClose,
    handleUpgrade,
} from '#vendor/start/wsHandler.js';
import {
    getHeaders,
    readJson,
    extractParameters,
    normalizePath,
} from '../httpRequestHandlers.js';
import logger from '#logger';
import { getListRoutes } from './router.js';
import { promises as fs } from 'node:fs';
//import middlewaresKernel from '#app/middlewares/kernel.js';
import validators from '#vendor/start/validators.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';

const MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    js: 'application/javascript; charset=UTF-8',
    json: 'application/json',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    txt: 'text/plain',
};
const STATIC_PATH = path.join(process.cwd(), './public');

const cache = new Map();

const cacheFile = async (filePath) => {
    const data = await fs.readFile(filePath, 'utf8');
    const key = filePath.substring(STATIC_PATH.length);
    cache.set(key, data);
};

const cacheDirectory = async (directoryPath) => {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(directoryPath, file.name);
        if (file.isDirectory()) cacheDirectory(filePath);
        else cacheFile(filePath);
    }
};

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
const setHttpHandler = async (res, req, route) => {
    // logger.info('Handler method:' + method);
    const method = route.method;
    if (state.listenSocket) {
        try {
            if (corsConfig.enabled && method === 'options') {
                //'OPTIONS'
                res.cork(() => {
                    setCorsHeader(res);
                    res.writeStatus('200').end();
                });
            }
            res.onAborted(() => {
                res.aborted = true;
            });

            const cookies = parseCookies(req.getHeader('cookie'));
            const contentType = req.getHeader('content-type').trim();
            const url = req.getUrl();
            const query = qs.parse(req.getQuery());
            const headers = getHeaders(req);
            const isJson =
                method === 'post' &&
                contentType.toLowerCase() === 'application/json';
            let payload = null;
            if (isJson) {
                payload = await readJson(res);
                if (route.validator) {
                    const validator = validators[route.validator];
                    if (validator) payload = await validator.validate(payload);
                }
            }
            const httpData = Object.freeze({
                params: extractParameters(route.url, url),
                payload,
                query,
                headers,
                contentType,
                cookies,
                isJson,
            });
            const responseData = {
                payload: {},
                middlewareData: {},
                headers: [], // [{name, value}]
                cookies: [],
                status: '200',
            };

            let result = null;
            if (route.middlewares?.length) {
                await executeMiddlewares(
                    route.middlewares,
                    httpData,
                    responseData,
                );
            }
            result = await route.handler(httpData, responseData);
            if (result && !res.aborted) {
                res.cork(() => {
                    if (isJson)
                        res.writeHeader('content-type', 'application/json');
                    if (result.headers?.length) setHeaders(res, result.headers);
                    if (result.cookies?.length) setCookies(res, result.cookies);
                    if (corsConfig.enabled) setCorsHeader(res);
                    res.writeStatus(result.status).end(
                        JSON.stringify(result.payload),
                    );
                });
            }
        } catch (e) {
            logger.error(e);
            res.cork(() => {
                if (e.code === 'E_VALIDATION_ERROR') {
                    res.writeStatus('422').end(
                        JSON.stringify({
                            message: 'Validation failure',
                            messages: e.messages,
                        }),
                    );
                }
                res.writeStatus('500').end('Server error');
            });
        }
    } else {
        logger.warn('We just refuse if already shutting down');
        res.close();
    }
};
const configureHttp = (server) => {
    if (appConfig.serveStatic) {
        logger.info('cache Directory ' + STATIC_PATH);
        cacheDirectory(STATIC_PATH).then(() => {
            logger.info('Success cache Directory ' + STATIC_PATH);
        });
    }

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
        res.cork(() => {
            let data = '404 error';
            let statusCode = '404';
            if (appConfig.serveStatic) {
                const url = req.getUrl();
                const ext = path.extname(url).substring(1).toLowerCase();
                if (ext) {
                    const mimeType = MIME_TYPES[ext] || MIME_TYPES.html;
                    data = cache.get(url);
                    statusCode = '200';
                    if (!data) {
                        statusCode = '404';
                        data = cache.get('/404.html');
                    }
                    res.writeHeader('Content-Type', mimeType);
                }
            }
            res.writeStatus(statusCode);
            res.end(data);
        });
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

    uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null;
};

export { init, stop };
