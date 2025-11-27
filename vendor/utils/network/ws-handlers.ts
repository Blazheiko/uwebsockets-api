import logger from '#logger';
import wsApiHandler from '../routing/ws-api-dispatcher.js';
import { generateUUID } from 'metautil';
import redis from '#database/redis.js';
import { HttpRequest, HttpResponse, us_socket_context_t } from 'uWebSockets.js';
import { MyWebSocket } from '../../types/types.js';
// import { broadcastOnline } from '#vendor/start/server.js';
import { wsSessionHandler } from '../session/session-handler.js';
import getIP from './get-ip.js';
import { wsEventEmitter } from '#vendor/utils/events/ws-event-manager.js';
import { makeJson } from '#vendor/utils/helpers/json-handlers.js';
import configApp from '#config/app.js';
const wsStorage: Set<MyWebSocket> = new Set();
const userStorage: Map<
    string,
    Map<string, { ip: string; userAgent: string; connection: MyWebSocket }>
> = new Map();

const getUserConnections = (userId: string) => {
    return userStorage.get(String(userId));
};


const sendJson = (ws: MyWebSocket, data: any) => {
    if (!ws || typeof ws.cork !== 'function') {
        logger.warn('Attempted to send message to closed or invalid WebSocket');
        return;
    }
    try {
        ws.cork(() => {
            ws.send(
                makeJson(data)
            );
        });
    } catch (e) {
        logger.error({ err: e }, 'Error in sendJson:');
        try {
            ws.close();
        } catch (closeError) {
            logger.error(
                { err: closeError },
                'Error closing WebSocket after send failure:',
            );
        }
    }
};

const setUserConnections = (
    userId: string,
    connections: Map<
        string,
        { ip: string; userAgent: string; connection: MyWebSocket }
    >,
) => {
    return userStorage.set(String(userId), connections);
};

const getOnlineUser = (usersOnline: string[]) => {
    const onlineUsers: string[] = [];
    for (const userId of usersOnline) {
        if (userStorage.has(String(userId))) onlineUsers.push(String(userId));
    }
    return onlineUsers;
};

const closeAllWs = async () => {
    for (const ws of wsStorage) {
        const token = ws.getUserData().token;
        if (token) await redis.del(`auth:ws:${token}`);
        try {
            ws.end(4201);
        } catch (e) {
            logger.warn('closeAllWs error');
        }
    }
    wsStorage.clear();
    userStorage.clear();
};

const handlePong = (ws: MyWebSocket) => {
    // const { sessionId, userId } = ws.getUserData();
    // if (sessionId && userId)  {
    //     // updateExpiration(token)
    //     sendJson(ws, {
    //         event: 'service:pong',
    //         status: 200,
    //         payload: null,
    //     });
    // }
    // logger.info('handlePong');
    sendJson(ws, {
        event: 'service:pong',
        status: 200,
        payload: null,
    });
};

const unAuthorizedMessage = () => ({
    event: 'service:error',
    status: 4001,
    payload: {
        message: `Session expired. Please login again.`,
    },
});

const ab2str = (
    buffer: ArrayBuffer,
    encoding: BufferEncoding | undefined = 'utf8',
) => Buffer.from(buffer).toString(encoding);

const onMessage = async (
    ws: MyWebSocket,
    wsMessage: ArrayBuffer,
    isBinary: boolean,
) => {
    // logger.info('new onMessage');
    const userData = ws.getUserData();
    const jsonMessage = ab2str(wsMessage);
    if (jsonMessage === 'ping'){
        try {
            ws.send('pong');
        } catch (e) {
            logger.error(
                { err: e },
                'Error ws send pong',
            );
        }
        return;
    }

    const message = JSON.parse(jsonMessage);
    // logger.info(message);

    // let tokenData = null;
    // if (isBinary) logger.info('isBinary', isBinary);

    try {
        // if (token) tokenData = await redis.getex(`auth:ws:${token}`, 'EX', 120);
        // let message = null;
        let session = null;
        if (userData.sessionId && userData.userId) {
            // logger.info(`onMessage userData.sessionId: ${userData.sessionId}`);
            // logger.info(`onMessage userData.userId: ${userData.userId}`);
            session = await wsSessionHandler(
                userData.sessionId,
                userData.userId,
            );
        }
        if (!session) {
            ws.cork(() => {
                try {
                    ws.send(makeJson(unAuthorizedMessage()));
                    ws.end(4001);
                } catch (e) {
                    logger.error(
                        { err: e },
                        'Error ws send unAuthorizedMessage',
                    );
                }
            });

            return;
        }

        if (message) {
            if (!message.event) {
                logger.error('onMessage message.event is null');
                sendJson(ws, {
                        status: '404',
                        message: 'Event not found',
                    });
            } else if (message.event === 'service:ping') {
                handlePong(ws);
            } else {
                const result = await wsApiHandler(
                    message,
                    ws,
                    userData,
                    session,
                );
                if (result) sendJson(ws, result);
                else {
                    logger.error('onMessage result is null');
                    sendJson(ws, {
                        status: '404',
                        message: 'Event not found',
                    });
                }
            }
        }else{
            logger.error('onMessage message is null');
            sendJson(ws, {
                status: '404',
                message: 'Message is null',
            });
        }
    } catch (err: any) {
        logger.error({ err }, 'Error parse onMessage');
        if (err.code === 'E_VALIDATION_ERROR') {
            sendJson(ws, {
                status: '422',
                message: 'Validation failure',
                messages: err.messages,
            });
        }
    }
};

const onClose = async (ws: MyWebSocket, code: number, message: any) => {
    logger.info('onClose code:', code);
    logger.info('onClose message:', message);
    try {
        const token = ws.getUserData().token;
        if (token) await redis.del(`auth:ws:${token}`);
        wsStorage.delete(ws);
        const userData = ws.getUserData();
        logger.info(userData);

        if (userData.userId && userData.sessionId && userData.uuid) {
            wsEventEmitter.emit('user_disconnected', {
                userId: userData.userId,
                sessionId: userData.sessionId,
                uuid: userData.uuid,
                code: code,
                timestamp: Date.now(),
            });
        }

        const userConnection = getUserConnections(userData.userId);
        if (userConnection) {
            userConnection.delete(userData.uuid);
            if (userConnection.size === 0) {
                userStorage.delete(userData.userId);
                // broadcastOnline(userData.userId, 'offline');
            }
        }
    } catch (e) {
        logger.error({ err: e }, 'Error onClose');
    }
};

const updateExpiration = (token: string) => {
    redis.expire(`auth:ws:${token}`, 120);
};

// const updateTimeout = (ws: MyWebSocket) => {
//     /* eslint-disable no-undef */
//     clearTimeout(ws.timeout);

//     ws.timeout = setTimeout(() => {
//         logger.warn('ws.end');
//         try {
//             ws.end(4201);
//         } catch (e) {
//             logger.warn('error close ws by timeout');
//         }
//     }, 120_000);
// };

const onOpen = async (ws: MyWebSocket) => {
    try {
        logger.info('onOpen ws');
        const userData = ws.getUserData();
        const token = userData.token;
        // let dataAccess: { sessionId: string, userId: number } | null = null;
        //
        // if (token) dataAccess = await checkUserAccess(token);

        if (!token || !userData || !userData.userId || !userData.sessionId) {
            const errorMessage = unAuthorizedMessage();
            logger.info(errorMessage);
            ws.cork(() => {
                try {
                    ws.send(
                        JSON.stringify(errorMessage, (_, v) =>
                            typeof v === 'bigint' ? v.toString() : v,
                        ),
                    );
                    ws.end(4001);
                } catch (e) {
                    logger.error(
                        { err: e },
                        'Error sending unauthorized message:',
                    );
                }
            });

            return;
        }

        const broadcastMessage = {
            event: 'service:connection_established',
            status: 200,
            payload: {
                socket_id: userData.uuid,
                activity_timeout: 30,
            },
        };
        // ws.subscribe(`user:${userData.userId}`);
        // ws.subscribe(`change_online`);
        sendJson(ws, broadcastMessage);
        wsStorage.add(ws);
        logger.info(`onOpen ws userId: ${userData.userId} `);

        const userConnection = getUserConnections(userData.userId);
        if (userConnection)
            userConnection.set(userData.uuid, {
                ip: userData.ip,
                userAgent: userData.userAgent,
                connection: ws,
            });
        else {
            setUserConnections(
                userData.userId,
                new Map([
                    [
                        userData.uuid,
                        {
                            ip: userData.ip,
                            userAgent: userData.userAgent,
                            connection: ws,
                        },
                    ],
                ]),
            );
            // broadcastOnline(userData.userId, 'online');
        }

        wsEventEmitter.emit('user_connected', {
            userId: userData.userId,
            sessionId: userData.sessionId,
            uuid: userData.uuid,
            ip: userData.ip,
            userAgent: userData.userAgent,
            timestamp: Date.now(),
            ws,
        });

        logger.info('onOpen ws end');
    } catch (e) {
        logger.error({ err: e }, 'Error in onOpen:');
        try {
            ws.end(4001);
        } catch (closeError) {
            logger.error({ err: closeError }, 'Error closing connection:');
        }
    }
};

const checkUserAccess = async (
    token: string,
): Promise<{ sessionId: string; userId: number } | null> => {
    if (!token) return null;
    try {
        const tokenData = await redis.get(`auth:ws:${token}`);
        if (!tokenData) return null;

        const userData = JSON.parse(tokenData);
        const { sessionId, userId } = userData;
        if (!sessionId || !userId) return null;

        const sessionData = await redis.get(`session:${userId}:${sessionId}`);
        if (!sessionData) return null;

        const sessionInfo = JSON.parse(sessionData);
        if (
            sessionInfo &&
            sessionId &&
            userId &&
            sessionInfo.data?.userId == userId
        )
            return { sessionId, userId };

        return null;
    } catch (error) {
        logger.error({ err: error }, 'Error checking user access:');
        return null;
    }
};

const checkToken = (token: string): boolean =>
    Boolean(token && token.length === configApp.accessTokenLength && /^[a-zA-Z0-9]+$/.test(token));

const handleUpgrade = async (
    res: HttpResponse,
    req: HttpRequest,
    context: us_socket_context_t,
): Promise<void> => {
    logger.info('handleUpgrade');
    let aborted = false;
    res.onAborted(() => {
        logger.warn('Client aborted before operation completed');
        aborted = true;
    });
    const secWebsocketKey = req.getHeader('sec-websocket-key');
    const secWebsocketProtocol = req.getHeader('sec-websocket-protocol');
    const secWebsocketExtensions = req.getHeader('sec-websocket-extensions');
    const userAgent = req.getHeader('user-agent');
    const ip = getIP(req, res);
    const token = req.getParameter(0);
    // Token validation
    if (!token || !checkToken(token)) {
        res.writeStatus('401 Unauthorized').end('Invalid token format');
        return;
    }
    const dataAccess: { sessionId: string; userId: number } | null =
        await checkUserAccess(token);

    if (!aborted) {
        res.cork(() => {
            res.upgrade(
                {
                    ip: ip,
                    ip2: ab2str(res.getProxiedRemoteAddressAsText()),
                    token: token,
                    user: null,
                    uuid: generateUUID(),
                    sessionId: dataAccess ? dataAccess.sessionId : undefined,
                    userId: dataAccess ? String(dataAccess.userId) : undefined,
                    timeStart: Date.now(),
                    userAgent,
                },
                secWebsocketKey,
                secWebsocketProtocol,
                secWebsocketExtensions,
                context,
            );
        });
    }
};

export {
    onMessage,
    onOpen,
    onClose,
    handleUpgrade,
    closeAllWs,
    getUserConnections,
    getOnlineUser,
};
