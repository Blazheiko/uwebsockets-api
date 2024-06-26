import logger from '#logger';
import wsApiHandler from '#vendor/wsApiHandler.js';
import { generateUUID } from 'metautil';
import redis from '#database/redis.js';

const wsStorage = new Set();

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

const handlePong = (ws) => {
    ws.sendJson({
        event: 'service:pong',
        data: {},
    });
};

const onMessage = async (ws, wsMessage, isBinary) => {
    if (isBinary) logger.info('isBinary', isBinary);
    try {
        let message = null;
        if (wsMessage instanceof ArrayBuffer)
            message = JSON.parse(ab2str(wsMessage));
        if (!message) return;
        if (message.event === 'service:ping') {
            handlePong(ws);
            return;
        }
        const result = await wsApiHandler(message);
        if (result) ws.sendJson(result);
    } catch (err) {
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
const onClose = (ws, code, message) => {
    logger.info('onClose code:', code);
    logger.info('onClose message:', message);
    // eslint-disable-next-line no-undef
    if (ws?.timeout) clearTimeout(ws.timeout);
    wsStorage.delete(ws);
};

const updateTimeout = (ws) => {
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

const onOpen = (ws) => {
    ws.sendJson = (data) => {
        try {
            ws.send(JSON.stringify(data));
            updateTimeout(ws);
        } catch (e) {
            logger.error('Error sendJson');
        }
    };
    ws.UUID = generateUUID();

    // if (this.server.closing) this.serverClosingHandler(ws)

    const userData = ws.getUserData();
    // const user = getUserByToken(userData.token);
    const token = redis.get(`auth:ws:${userData.token}`);
    if (!token) {
        const errorMessage = {
            event: 'service:error',
            data: {
                code: 4001,
                message: `Token ${userData.token} does not exist.`,
            },
        };
        logger.info(errorMessage);
        // this.errorClientHandler(ws, errorMessage)
        return ws.end(4001);
    }
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

const ab2str = (buffer, encoding = 'utf8') =>
    /* eslint-disable no-undef */
    Buffer.from(buffer).toString(encoding);

const handleUpgrade = (res, req, context) => {
    const userAgent = req.getHeader('user-agent');
    let ip = req.getHeader('x-forwarded-for');
    if (ip && typeof ip === 'string') ip = ip.trim();

    res.upgrade(
        {
            ip: ip ? ip : ab2str(res.getRemoteAddressAsText()),
            ip2: ab2str(res.getProxiedRemoteAddressAsText()),
            token: req.getParameter(0),
            user: null,
            timeStart: Date.now(),
            userAgent,
        },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context,
    );
};
export { onMessage, onOpen, onClose, handleUpgrade, closeAllWs };
