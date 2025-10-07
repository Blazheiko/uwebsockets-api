import uWS, {
    HttpRequest,
    HttpResponse,
    TemplatedApp,
    us_listen_socket,
    us_socket_context_t,
    WebSocket,
} from 'uWebSockets.js';
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
} from '#vendor/utils/routing/ws-router.js';
import {
    getHeaders,
    getData,
    extractParameters,
    normalizePath,
    isValidUrl,
} from '../utils/network/http-request-handlers.js';
import logger from '#logger';
import { getListRoutes } from './router.js';

import validators from '#vendor/start/validators.js';
import executeMiddlewares from '#vendor/utils/middlewares/core/execute-middlewares.js';
import checkRateLimit from '#vendor/utils/rate-limit/http-rate-limit.js';
import {
    Cookie,
    Header,
    HttpContext,
    HttpData,
    MyWebSocket,
    ResponseData,
    RouteItem,
    Session,
} from '../types/types.js';
import contextHandler from '../utils/context/http-context.js';
import {
    startStaticServer,
    staticHandler,
    staticIndexHandler,
} from './staticServer.js';
import configApp from '#config/app.js';
import httpRoutes from '#app/routes/http-routes.js';
import wsRoutes from '#app/routes/ws-routes.js';
import schemas from '#app/validate/schemas/schemas.js';
import getIP from '#vendor/utils/network/get-ip.js';
import { getApiTypesForDocumentation } from '#vendor/utils/tooling/parse-types-from-dts.js';
import { serializeRoutes } from '#vendor/utils/routing/serialize-routes.js';
import path from 'path';

const server: TemplatedApp = uWS.App();

const broadcastMessage = (userId: number, event: string, payload: any) => {
    logger.info(`broadcastMessage: ${userId} ${event}`);
    if (server && state.listenSocket)
        server.publish(
            `user:${userId}`,
            JSON.stringify(
                { event: `broadcast:${event}`, status: 200, payload },
                (_, v) => (typeof v === 'bigint' ? v.toString() : v),
            ),
        );
};

const broadcastOnline = (userId: number, status: string) => {
    server.publish(
        `change_online`,
        JSON.stringify({
            event: `broadcast:change_online`,
            status: 200,
            payload: { userId, status },
        }),
    );
};

const configureWebsockets = (server: TemplatedApp) => {
    return server.ws('/websocket/:token', {
        compression: 0,
        idleTimeout: 120, // According to protocol
        maxPayloadLength: 1 * 1024 * 1024,
        maxBackpressure: 64 * 1024,
        open: (ws: WebSocket<any>) => onOpen(ws as MyWebSocket),
        message: (
            ws: WebSocket<any>,
            message: ArrayBuffer,
            isBinary: boolean,
        ) => onMessage(ws as MyWebSocket, message, isBinary),
        // upgrade: async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
        //    await handleUpgrade(res, req, context);
        // },
        upgrade: handleUpgrade,
        // drain: (ws) => handleDrain(ws),
        close: (ws, code, message) => onClose(ws as MyWebSocket, code, message),
    });
};
const checkCookie = (key: string, value: string): boolean =>
    Boolean(value) &&
    value.length < appConfig.reasonableCookieLimit &&
    /^[a-zA-Z0-9_-]+$/.test(key) &&
    key.length < 255;

const parseCookies = (cookieHeader: string): Map<string, string> => {
    const list = new Map<string, string>();
    if (cookieHeader) {
        const handler = (cookie: string): void => {
            const separatorIndex = cookie.indexOf('=');
            if (separatorIndex === -1) return;
            try {
                const key = cookie.slice(0, separatorIndex).trim();
                const value = cookie.slice(separatorIndex + 1).trim();
                if (checkCookie(key, value)) {
                    // Reasonable limit
                    list.set(key, decodeURIComponent(value));
                }
            } catch (error) {
                console.error(
                    `Error decoding cookie value ${cookieHeader}":`,
                    error,
                );
            }
        };

        let start = 0;

        for (let i = 0; i <= cookieHeader.length; i++) {
            if (i === cookieHeader.length || cookieHeader[i] === ';') {
                handler(cookieHeader.slice(start, i).trim());
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
const setCookies = (res: HttpResponse, cookies: Record<string, Cookie>) => {
    for (const cookie of Object.values(cookies)) {
        const cookieHeader = `${cookie.name}=${encodeURIComponent(cookie.value)}`;
        const pathPart = cookie.path ? `; Path=${cookie.path}` : '';
        const expiresPart = cookie.expires
            ? `; Expires=${cookie.expires.toUTCString()}`
            : '';
        const httpOnlyPart = cookie.httpOnly ? '; HttpOnly' : '';
        const securePart = cookie.secure ? '; Secure' : '';
        const maxAgePart = cookie.maxAge ? `; Max-Age=${cookie.maxAge}` : '';
        const sameSitePart = cookie.sameSite
            ? `; SameSite=${cookie.sameSite}`
            : '';
        res.writeHeader(
            'Set-Cookie',
            `${cookieHeader}${pathPart}${expiresPart}${httpOnlyPart}${securePart}${maxAgePart}${sameSitePart}`,
        );
    }
};

const setHeaders = (res: HttpResponse, headers: Header[]) => {
    // for (const header of headers) {
    //     res.writeHeader(header.name, header.value);
    // }
    headers.forEach((header) => {
        res.writeHeader(header.name, header.value);
    });
};

// CSP header is applied from staticServer for HTML responses
const getResponseData = (): ResponseData => {
    let cookies: Record<string, Cookie> = {};
    const headers: Header[] = [];
    const setCookie = (name: string, value: string, options: any = {}) =>
        (cookies[name] = {
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
    const deleteCookie = (name: string) => {
        delete cookies[name];
    };
    const setHeader = (name: string, value: string) =>
        headers.push({ name, value });

    return {
        aborted: false,
        payload: {},
        middlewareData: null,
        headers,
        cookies,
        status: 200,
        setCookie,
        deleteCookie,
        setHeader,
    };
};

const getHttpData = async (
    req: HttpRequest,
    res: HttpResponse,
    route: RouteItem,
): Promise<HttpData> => {
    const cookies: Map<string, string> = parseCookies(req.getHeader('cookie'));
    // const contentType = req.getHeader('content-type').trim();
    const url = req.getUrl();
    // const query = qs.parse(req.getQuery());
    const query = new URLSearchParams(req.getQuery());
    const headers = getHeaders(req);
    const params = extractParameters(route.parametersKey, req);
    const contentType = headers.get('content-type');
    // const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
    const ip = getIP(req, res);
    const isJson = Boolean(
        (route.method === 'post' || route.method === 'put') &&
            contentType &&
            contentType.trim().toLowerCase() === 'application/json',
    );

    let payload: any =
        isJson && contentType ? await getData(res, contentType) : null;
    if (payload && route.validator) {
        const validator = validators.get(route.validator);
        if (validator) payload = await validator.validate(payload);
    }

    return Object.freeze({
        ip,
        params,
        payload,
        query,
        headers,
        contentType,
        cookies,
        isJson,
    });
};

// const transformBigInts = (obj: any): any => {
//     if (obj === null || obj === undefined) return obj;
//
//     if (typeof obj === 'bigint') {
//         return obj.toString();
//     }
//
//     if (Array.isArray(obj)) {
//         return obj.map(transformBigInts);
//     }
//
//     if (typeof obj === 'object') {
//         const transformed: any = {};
//         for (const [key, value] of Object.entries(obj)) {
//             transformed[key] = transformBigInts(value);
//         }
//         return transformed;
//     }
//
//     return obj;
// }

const sendResponse = (
    res: HttpResponse,
    httpData: HttpData,
    responseData: ResponseData,
) => {
    res.writeStatus(`${responseData.status}`);
    // if (httpData.isJson) res.writeHeader('content-type', 'application/json');
    res.writeHeader('content-type', 'application/json');
    if (responseData.headers?.length) setHeaders(res, responseData.headers);
    if (responseData.cookies) setCookies(res, responseData.cookies);
    if (corsConfig.enabled) setCorsHeader(res);
    // && responseData.status >= 200 && responseData.status < 300
    if (
        responseData.payload 
    ) {
        // const transformedData = transformBigInts(responseData.payload);
        // res.end(JSON.stringify(transformedData));
        res.end(
            JSON.stringify(responseData.payload, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v,
            ),
        );
    } else res.end(`${responseData.status}`);
};

interface ValidationError extends Error {
    code?: string;
    messages?: string[];
}

interface State {
    listenSocket: us_listen_socket | null;
}

const handleError = (res: HttpResponse, error: unknown) => {
    logger.error({ err: error }, 'Handle Error');
    
    if ((error as ValidationError).code === 'E_VALIDATION_ERROR') {
        const validationError = error as ValidationError;
        // res.writeHeader('content-type', 'application/json');
        res.writeStatus('422')
        res.end(
                JSON.stringify({
                    message: 'Validation failure',
                    messages: validationError.messages,
                }),
            ); 
        
    } else {
        const errorMessage =
            configApp.env === 'prod' || configApp.env === 'production'
                ? 'Internal server error'
                : String(error);
        res.writeStatus('500')
        res.end(JSON.stringify(errorMessage));
    }
};

const staticRoutes = [
    '/',
    '/chat',
    '/login',
    '/register',
    '/chat',
    '/account',
    '/news',
    '/news/create',
    '/news/edit',
    '/news/:id',
    '/manifesto',
    '/invitations',
    '/join-chat',
];

// Always point to source types directory, not dist
const projectRoot = process.cwd();
const typesDirectory = path.join(projectRoot, 'app/controllers/http/types');

// Parse types from .d.ts files
let types: any = {};
let mapping: Record<string, string> = {};
if (configApp.docPage) {
    ({ types, mapping } = getApiTypesForDocumentation(
        typesDirectory,
        httpRoutes,
    ));
}

const docRoutesHandler = async (res: HttpResponse, req: HttpRequest) => {
    logger.info('docRoutesHandler');
    if (state.listenSocket && configApp.docPage && configApp.serveStatic) {
        try {
            // Convert schemas to readable format
            const validationSchemas: Record<string, any> = {};

            for (const key of Object.keys(schemas)) {
                validationSchemas[key] = schemas[key].doc;
            }

            // Serialize routes with handler names instead of function references

            const serializedHttpRoutes = serializeRoutes(httpRoutes);
            const serializedWsRoutes = serializeRoutes(wsRoutes);

            res.cork(() => {
                res.writeStatus(`200`);
                res.writeHeader('content-type', 'application/json');
                res.end(
                    JSON.stringify({
                        httpRoutes: serializedHttpRoutes,
                        wsRoutes: serializedWsRoutes,
                        validationSchemas,
                        responseTypes: types,
                        handlerTypeMapping: mapping,
                        pathPrefix: appConfig.pathPrefix,
                    }),
                );
            });
        } catch (err: unknown) {
            logger.error({ err }, 'docRoutesHandler error');
            res.cork(() => {
                handleError(res, err);
            });
        }
    } else {
        logger.warn('We just refuse if already shutting down');
        res.cork(() => {
            res.writeStatus('404').end(
                JSON.stringify({
                    message: 'Not found',
                }),
            );
        });
    }
};

const setHttpHandler = async (
    res: HttpResponse,
    req: HttpRequest,
    route: RouteItem,
) => {
    logger.info('Handler method:' + route.method + ' url:' + route.url);
    if (state.listenSocket) {
        try {
            let aborted = false;
            res.onAborted(() => {
                aborted = true;
            });
            const httpData = await getHttpData(req, res, route);
            const responseData = getResponseData();
            const context = contextHandler(httpData, responseData);

            // Check rate limit before executing middleware
            const rateLimitPassed = await checkRateLimit(
                httpData,
                responseData,
                route,
                route.groupRateLimit,
            );

            if (
                rateLimitPassed &&
                (route.middlewares?.length === 0 ||
                    (await executeMiddlewares(route.middlewares, context))) &&
                responseData.status >= 200 &&
                responseData.status < 300
            )
                responseData.payload = await route.handler(context);

            if (aborted) return;
            res.cork(() => {
                sendResponse(res, httpData, responseData);
            });
        } catch (err: unknown) {
            logger.error({ err }, 'Set Http Handler Error');
            res.cork(() => {
                handleError(res, err); 
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
    if (appConfig.serveStatic) {
        startStaticServer();
        staticRoutes.forEach((route) => {
            server.get(route, (res, req) => {
                staticIndexHandler(res, req);
            });
        });
    }
    getListRoutes().forEach((route: RouteItem) => {
        if (route.method !== 'ws' && route.method !== 'delete') {
            server[route.method](
                `/${normalizePath(route.url)}`,
                async (res: HttpResponse, req: HttpRequest) => {
                    await setHttpHandler(res, req, route);
                },
            );
        }
    });
    if (configApp.docPage && configApp.serveStatic) {
        server.get(`/${appConfig.pathPrefix}/doc/routes`, (res, req) => {
            docRoutesHandler(res, req);
        });
    }

    server.any('/*', (res, req) => {
        const url = req.getUrl();

        if (
            appConfig.serveStatic &&
            req.getMethod() === 'get' &&
            url.indexOf('.') !== -1
        ) {
            staticHandler(res, req);
        } else if (corsConfig.enabled && req.getMethod() === 'options') {
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
    configureWebsockets(server);
    configureHttp(server);
    if (appConfig.unixPath) {
        server.listen_unix((token) => {
            if (token) {
                logger.info(`Listening unix socket: ${appConfig.unixPath}`);
                state.listenSocket = token as any;
            } else {
                logger.error(
                    `Failed to listening unix socket: ${appConfig.unixPath}`,
                );
            }
        }, appConfig.unixPath);
    } else {
        server.listen(appConfig.host, appConfig.port, (token) => {
            if (token) {
                logger.info(
                    `Listening http://${appConfig.host}:` + appConfig.port,
                );
                state.listenSocket = token as any;
            } else {
                logger.error('Failed to listen to port ' + appConfig.port);
            }
        });
    }
};

const stopServer = (type = 'handle') => {
    logger.info('server stop type: ' + type);
    closeAllWs();
    if (state.listenSocket) uWS.us_listen_socket_close(state.listenSocket);
    state.listenSocket = null;
};

export { initServer, stopServer, broadcastMessage, broadcastOnline };
