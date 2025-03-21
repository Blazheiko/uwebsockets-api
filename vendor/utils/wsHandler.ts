import logger from '#logger';
import wsApiHandler from '#vendor/utils/wsApiHandler.js';
import { generateUUID } from 'metautil';
import redis from '#database/redis.js';
import { HttpRequest, HttpResponse, us_socket_context_t } from 'uWebSockets.js';
import { MyWebSocket } from '../types/types.js';
import session from '../../config/session.js';
import user from '../../app/models/User.js';



const wsStorage: Set<MyWebSocket> = new Set();

const closeAllWs = () => {
    for (const ws of wsStorage) {
        // eslint-disable-next-line no-undef
        if (ws?.timeout) clearTimeout(ws.timeout);
        try {
            ws.end(4201);
        } catch (e) {
            logger.warn('closeAllWs error');
        }
    }
    wsStorage.clear();
};

const handlePong = (ws: MyWebSocket) => {
    ws.sendJson({
        event: 'service:pong',
        data: {},
    });
};

const onMessage = async (ws: MyWebSocket, wsMessage: ArrayBuffer, isBinary: boolean) => {
    if (isBinary) logger.info('isBinary', isBinary);
    try {
        // let message = null;
        const message = JSON.parse(ab2str(wsMessage));
        if (!message) return;
        if (message.event === 'service:ping') {
            handlePong(ws);
            return;
        }
        const result = await wsApiHandler(message);
        if (result) ws.sendJson(result);
    } catch (err: any) {
        logger.error('Error parse onMessage');
        logger.error(err);
        if (err.code === 'E_VALIDATION_ERROR') {
            ws.sendJson({
                status: '422',
                message: 'Validation failure',
                messages: err.messages,
            });
        }
    }
};
const onClose = (ws: MyWebSocket, code: number, message: any) => {
    logger.info('onClose code:', code);
    logger.info('onClose message:', message);
    // eslint-disable-next-line no-undef
    if (ws?.timeout) clearTimeout(ws.timeout);
    wsStorage.delete(ws);
};

const updateTimeout = (ws: MyWebSocket) => {
    /* eslint-disable no-undef */
    clearTimeout(ws.timeout);

    ws.timeout = setTimeout(() => {
        logger.warn('ws.end');
        try {
            ws.end(4201);
        } catch (e) {
            logger.warn('error close ws by timeout');
        }
    }, 120_000);
};

const onOpen = (ws: MyWebSocket) => {
    ws.sendJson = (data: any) => {
        try {
            ws.send(JSON.stringify(data));
            updateTimeout(ws);
        } catch (e) {
            logger.error('Error sendJson');
        }
    };
    ws.UUID = generateUUID();

    // if (this.server.closing) this.serverClosingHandler(ws)

    // const userData = ws.getUserData();
    // // const user = getUserByToken(userData.token);
    // const token = redis.get(`auth:ws:${userData.token}`);
    // if (!token) {
    //     const errorMessage = {
    //         event: 'service:error',
    //         data: {
    //             code: 4001,
    //             message: `Token ${userData.token} does not exist.`,
    //         },
    //     };
    //     logger.info(errorMessage);
    //     // this.errorClientHandler(ws, errorMessage)
    //     return ws.end(4001);
    // }
    let broadcastMessage = {
        event: 'service:connection_established',
        data: {
            socket_id: ws.id,
            activity_timeout: 30,
        },
    };

    ws.sendJson(broadcastMessage);
    wsStorage.add(ws);
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
    if (!dataAccess && !aborted) {
        logger.warn('Access ws denied');
        res.cork(() => {
            res.writeStatus('401 Unauthorized');
            res.end('Access denied');
        });

    }else if(!aborted) {
        res.upgrade(
            {
                ip: ip ? ip : ab2str(res.getRemoteAddressAsText()),
                ip2: ab2str(res.getProxiedRemoteAddressAsText()),
                token: token,
                user: null,
                sessionId: dataAccess? dataAccess.sessionId : undefined,
                userId: dataAccess?  dataAccess.userId : undefined,
                timeStart: Date.now(),
                userAgent,
            },
            secWebsocketKey,
            secWebsocketProtocol,
            secWebsocketExtensions,
            context,
        );
    }
};

export { onMessage, onOpen, onClose, handleUpgrade, closeAllWs };
