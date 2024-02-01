import logger from "../logger.js";
import wsApiHandler from "../api/ws/wsApiHandler.js";

const  handlePong = (ws) => {
    ws.send(JSON.stringify({
        event: 'pusher:pong',
        data: {},
    }));
}

const onMessage = async (ws, wsMessage, isBinary) => {
    try {
        let message = null;
        if (wsMessage instanceof ArrayBuffer)  message = JSON.parse(ab2str(wsMessage));
        if(!message) return;
        if (message.event === 'service:ping') {
            handlePong(ws);
            return;
        }
        const result = await wsApiHandler(message)
        ws.send(JSON.stringify( result ));

    } catch (err) {
        logger.error('Error parse onMessage')
        logger.error(err)
    }
}
const onClose = (ws, code, message) => {

}

const onOpen = (ws) => {

}

const ab2str = (buffer, encoding='utf8') =>  Buffer.from(buffer).toString(encoding)

const handleUpgrade = (res, req, context) => {

    const userAgent = req.getHeader('user-agent');
    let ip = req.getHeader('x-forwarded-for');
    if(ip && typeof ip === 'string')ip = ip.trim()

    res.upgrade(
        {
            ip: ip ? ip : ab2str(res.getRemoteAddressAsText()),
            ip2: ab2str(res.getProxiedRemoteAddressAsText()),
            token: req.getParameter(0),
            user: null,
            timeStart: Date.now(),
            userAgent
        },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context,
    );
}
const handleDrain = (ws) => {

}
export { onMessage,onOpen, onClose, handleUpgrade,handleDrain }
