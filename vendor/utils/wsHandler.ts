import logger from '#logger';
import wsApiHandler from '#vendor/utils/wsApiHandler.js';
import { generateUUID } from 'metautil';
import redis from '#database/redis.js';
import { HttpRequest, HttpResponse, us_socket_context_t } from 'uWebSockets.js';
import { MyWebSocket } from '../types/types.js';

const wsStorage: Set<MyWebSocket> = new Set();

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
};

const handlePong = (ws: MyWebSocket) => {
    const token = ws.getUserData().token;
    if (token) {
        updateExpiration(token)
        sendJson(ws, {
            event: 'service:pong',
            data: {},
        });
    }
};

const unAuthorizedMessage = (token: string) => ({
    event: 'service:error',
    data: {
        code: 4001,
        message: `Token ${token} does not exist.`,
    }
});

const onMessage = async (ws: MyWebSocket, wsMessage: ArrayBuffer, isBinary: boolean) => {
    const token = ws.getUserData().token;
    const message = JSON.parse(ab2str(wsMessage));

    let tokenData = null;
    // if (isBinary) logger.info('isBinary', isBinary);

    try {
        if (token) tokenData = await redis.getex(`auth:ws:${token}`, 'EX', 120);
        // let message = null;
        if(!tokenData) {
            ws.cork(() => {
                ws.send(JSON.stringify(unAuthorizedMessage(token)));
                ws.end(4001);
            })
            return;
        }

        if (message) {
            if (message.event === 'service:ping') handlePong(ws);
            else{
                const userData = ws.getUserData();
                const result = await wsApiHandler(message , userData);
                if (result) sendJson(ws, result );
            }
        }
       
    } catch (err: any) {
        logger.error('Error parse onMessage');
        logger.error(err);
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
        // if (ws?.timeout) clearTimeout(ws.timeout);
        const token = ws.getUserData().token;
        if (token) await redis.del(`auth:ws:${token}`);
        wsStorage.delete(ws);
    }catch (e) {
        logger.error('Error onClose');
        logger.error(e);
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

const sendJson = (ws: MyWebSocket, data: any) => {
    try {
        ws.cork(() => {
            ws.send(JSON.stringify(data));
        })
        // updateExpiration(token);
    } catch (e) {
        logger.error('Error sendJson');
    }
};
const onOpen = async (ws: MyWebSocket) => {
    
    const userData = ws.getUserData();
    // const user = getUserByToken(userData.token);
    const token = userData.token;
    let dataAccess: { sessionId: string, userId: number } | null = null;

    if (token) dataAccess = await checkUserAccess(token);
    // const token = redis.get(`auth:ws:${userData.token}`);
    if (!token || !dataAccess) {
        const errorMessage = unAuthorizedMessage(userData.token);
        logger.info(errorMessage);
        ws.cork(() => {
            ws.send(JSON.stringify(errorMessage));
            ws.end(4001);
        })

    }else{
        let broadcastMessage = {
            event: 'service:connection_established',
            data: {
                socket_id: userData.uuid,
                activity_timeout: 30
            }
        };
        sendJson(ws, broadcastMessage );
        wsStorage.add(ws);
    }
};

const ab2str = (buffer: ArrayBuffer, encoding: BufferEncoding | undefined = 'utf8') => Buffer.from(buffer).toString(encoding);

const checkUserAccess = async (token: string): Promise<{ sessionId: string , userId: number  } | null> => {
    if (!token) return null;
    try {
        const tokenData = await redis.get(`auth:ws:${token}`);
        if (!tokenData) return null;

        const userData = JSON.parse(tokenData);
        const { sessionId, userId } = userData
        if (!sessionId || !userId) return null;

        const sessionData = await redis.get(`session:${userId}:${sessionId}`);
        if (!sessionData) return null;

        const sessionInfo = JSON.parse(sessionData);
        if(sessionInfo && sessionId && userId && sessionInfo.data?.userId == userId)
            return { sessionId, userId }

        return null;
    } catch (error) {
        logger.error('Error checking user access:', error);
        return null;
    }
}


const handleUpgrade = async (res: HttpResponse, req: HttpRequest, context: us_socket_context_t): Promise<void> => {
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
    let ip = req.getHeader('x-forwarded-for');
    if (ip) ip = ip.trim();
    const token = req.getParameter(0);
    let dataAccess: { sessionId: string, userId: number } | null = null;

    if (token) dataAccess = await checkUserAccess(token);

    // if (!dataAccess && !aborted) {
    //     logger.warn('Access ws denied');
    //     res.cork(() => {
    //         res.writeStatus('401 Unauthorized');
    //         res.end('Access denied');
    //     });

    // }else 
    if(!aborted) {
        res.cork(() => {

            res.upgrade(
                {
                    ip: ip ? ip : ab2str(res.getRemoteAddressAsText()),
                    ip2: ab2str(res.getProxiedRemoteAddressAsText()),
                    token: token,
                    user: null,
                    uuid: generateUUID(),
                    sessionId: dataAccess ? dataAccess.sessionId : undefined,
                    userId: dataAccess ? dataAccess.userId : undefined,
                    timeStart: Date.now(),
                    userAgent,
                },
                secWebsocketKey,
                secWebsocketProtocol,
                secWebsocketExtensions,
                context,
            );
        })
    }
};

export { onMessage, onOpen, onClose, handleUpgrade, closeAllWs };
