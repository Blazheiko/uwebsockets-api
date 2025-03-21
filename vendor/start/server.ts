import uWS, { HttpRequest, HttpResponse, TemplatedApp, WebSocket } from 'uWebSockets.js';
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
} from '#vendor/utils/wsHandler.js';
import {
    getHeaders,
    getData,
    extractParameters,
    normalizePath,
} from '../utils/httpRequestHandlers.js';
import logger from '#logger';
import { getListRoutes } from './router.js';

import validators from '#vendor/start/validators.js';
import executeMiddlewares from '#vendor/utils/executeMiddlewares.js';
import {
    Cookie,
    Header,
    HttpContext,
    HttpData,
    MyWebSocket,
    ResponseData,
    RouteItem,
    Session
} from '../types/types.js';
import contextHandler from '../utils/contextHandler.js';

const configureWebsockets = (server: TemplatedApp) => {
    return server.ws('/websocket/:token', {
        compression: 0,
        idleTimeout: 120, // According to protocol
        maxBackpressure: 1024 * 1024,
        maxPayloadLength: 100 * 1024 * 1024, // 100 MB
        open: (ws: WebSocket<any>) => onOpen(ws as MyWebSocket),
        message: (ws: WebSocket<any>, message: ArrayBuffer, isBinary: boolean) => onMessage(ws as MyWebSocket, message, isBinary),
        upgrade: (res: HttpResponse, req: HttpRequest, context) => handleUpgrade(res, req, context),
        // drain: (ws) => handleDrain(ws),
        close: (ws, code, message) => onClose(ws as MyWebSocket, code, message),
    });
};

const parseCookies = (cookieHeader: string):Map <string, string> => {
    const list = new Map<string, string>();
    if (cookieHeader){
        const handler = (cookie: string): void => {
            const separatorIndex = cookie.indexOf('=');
            if (separatorIndex === -1) return;
            try {
                const key = cookie.slice(0, separatorIndex).trim();
                const value = cookie.slice(separatorIndex + 1).trim();
                if(value) list.set(key, decodeURIComponent(value));
            } catch (error) {
                console.error(`Error decoding cookie value ${cookieHeader}":`, error);
            }
        }

        let start = 0;

        for (let i = 0; i <= cookieHeader.length; i++) {
            if (i === cookieHeader.length || cookieHeader[i] === ';') {
                handler ( cookieHeader.slice(start, i).trim() );
                start = i + 1;
            }
        }
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
const setCookies = (res: HttpResponse, cookies: Cookie[]) => {
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

const setHeaders = (res: HttpResponse, headers: Header[]) => {
    headers.forEach((header) => {
        res.writeHeader(header.name, header.value);
    });
};
const getResponseData = (): ResponseData => {
    const cookies: Cookie[] = [];
    const headers: Header[] = [];
    const setCookie = (name: string, value: string, options: any = {}) =>
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
    const setHeader = (name: string, value: string) => headers.push({ name, value });

    return {
        aborted: false,
        payload: {},
        middlewareData: null,
        headers,
        cookies,
        status: 200,
        setCookie,
        setHeader,
    };
};

const getHttpData = async (req: HttpRequest, res: HttpResponse, route: RouteItem): Promise<HttpData> => {
    const cookies: Map<string, string> = parseCookies(req.getHeader('cookie'));
    // const contentType = req.getHeader('content-type').trim();
    const url = req.getUrl();
    // const query = qs.parse(req.getQuery());
    const query = new URLSearchParams(req.getQuery());
    const headers = getHeaders(req);
    const params = extractParameters(route.url, url);
    const contentType = headers.get('content-type');
    const isJson = Boolean((route.method === 'post' || route.method === 'put') &&
        (contentType && contentType.trim().toLowerCase() === 'application/json'));

    let payload: any = (isJson && contentType ) ? await getData(res, contentType) : null;
    if (payload && route.validator) {
        const validator = validators.get(route.validator);
        if (validator) payload = await validator.validate(payload);
    }

    return Object.freeze({
        params,
        payload,
        query,
        headers,
        contentType,
        cookies,
        isJson,
    });
};

const setHttpHandler = async (res: HttpResponse, req: HttpRequest, route: RouteItem) => {
    logger.info('Handler method:' + route.method + ' url:' + route.url);
    if (state.listenSocket) {
        try {
            let aborted = false;
            res.onAborted(() => {
                aborted = true;
            });
            const httpData = await getHttpData(req, res, route);
            const responseData = getResponseData();
            const context = contextHandler( httpData, responseData )

            if( await executeMiddlewares(route.middlewares, context ) && responseData.status >= 200 && responseData.status < 300 )
                responseData.payload = await route.handler( context );

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
                if(responseData.payload && responseData.status >= 200 && responseData.status < 300) res.end(JSON.stringify(responseData.payload));
                else res.end(`${responseData.status}`);
            });
        } catch (e: any) {
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
                    logger.error(e);
                    res.writeStatus('500').end('Server error');
                }
            });
        }
    } else {
        logger.warn('We just refuse if already shutting down');
        res.close();
    }
};
const configureHttp = (server: TemplatedApp) => {
    logger.info('configureHttp get');
    // console.log(getGetRoutes());
    getListRoutes().forEach((route: RouteItem) => {
        // console.log(route);
        // @ts-ignore
        server[route.method](
            `/${normalizePath(route.url)}`,
            async (res: HttpResponse, req: HttpRequest) => {
                await setHttpHandler(res, req, route);
            },
        );
    });

    server.any('/*', (res, req) => {
        if (corsConfig.enabled && req.getMethod() === 'options') {
            //'OPTIONS' method === 'OPTIONS'
            res.cork(() => {
                if (corsConfig.enabled) setCorsHeader(res);
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

const setCorsHeader = (res: HttpResponse) => {
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
const initServer = () => {
    const server: TemplatedApp = uWS.App();
    configureWebsockets(server);
    configureHttp(server);
    if(appConfig.unixPath){
        server.listen_unix((token) => {
            if (token) {
                logger.info(`Listening unix socket: ${appConfig.unixPath}`);
                state.listenSocket = token;
            } else {
                logger.error(`Failed to listening unix socket: ${appConfig.unixPath}`);
            }
        }, appConfig.unixPath);
    }else {
        server.listen(appConfig.host, appConfig.port, (token) => {
            if (token) {
                logger.info(`Listening http://${appConfig.host}:` + appConfig.port);
                state.listenSocket = token;
            } else {
                logger.error('Failed to listen to port ' + appConfig.port);
            }
        });
    }

};

const stopServer = (type = 'handle') => {
    logger.info('server stop type: ' + type);
    closeAllWs();
    uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null;
};

export { initServer, stopServer };
