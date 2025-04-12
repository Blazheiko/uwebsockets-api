import { HttpContext } from '../types/types.js';
import sessionConfig from '#config/session.js';
// import logger from '../../logger.js';
import { sessionHandler } from './sessionHandler.js';

const sessionWeb = async (context: HttpContext, next: Function) => {

    const { httpData } = context;
    const cookies = httpData.cookies;
    const sessionId = cookies.get(sessionConfig.cookieName);
    await sessionHandler( context, sessionId, undefined )

    await next()
};

export default sessionWeb;
