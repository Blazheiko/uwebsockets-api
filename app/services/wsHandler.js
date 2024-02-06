import logger from '#logger';
import wsApiHandler from '#app/api/ws/wsApiHandler.js';
import { getUserByToken } from '#app/state/userStorage.js';
import { generateUUID } from 'metautil';

const handlePong = (ws) => {
    ws.sendJson({
        event: 'pusher:pong',
        data: {},
    });
};

const onMessage = async (ws, wsMessage, isBinary) => {
    if (!isBinary) logger.info('isBinary', isBinary);
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
    }
};
const onClose = (ws, code, message) => {
    logger.info('onClose code:', code);
    logger.info('onClose message:', message);
};

const updateTimeout = (ws) => {
    /* eslint-disable no-undef */
    if (ws.timeout) clearTimeout(ws.timeout);

    ws.timeout = setTimeout(() => {
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
    const user = getUserByToken(userData.token);
    if (!user) {
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
        data: JSON.stringify({
            socket_id: ws.id,
            activity_timeout: 30,
        }),
    };

    ws.sendJson(broadcastMessage);
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
export { onMessage, onOpen, onClose, handleUpgrade };
