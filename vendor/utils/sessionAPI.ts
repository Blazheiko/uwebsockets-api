import { HttpContext } from '../types/types.js';
import sessionConfig from '#config/session.js';
import logger from '../../logger.js';
import sessionHandler from './sessionHandler.js';

const sessionAPI = async (context: HttpContext, next: Function) => {

    const { httpData } = context;
    const headers = httpData.headers;
    const authorization = headers.get('authorization');
    let sessionId = ''
    if (authorization && authorization.startsWith('Bearer ')) {
        sessionId = authorization.slice(7);
    }
    await sessionHandler( context, sessionId )

    await next()
};

export default sessionAPI;