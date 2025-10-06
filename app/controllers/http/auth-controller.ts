import User from '#app/models/user.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { generateKey, hashPassword, validatePassword } from 'metautil';
import redis from '#database/redis.js';
// import configSession from '#config/session.js';
import configApp from '#config/app.js';
import { prisma } from '#database/prisma.js';
import inventionAccept from '../../servises/invention-accept.js';
import generateWsToken from '../../servises/generate-ws-token.js';

export default {
    async register(context: HttpContext) {
        const { httpData, auth, session, logger } = context;
        logger.info('register handler');
        const {name , email , password, token } = httpData.payload;
        const exist = await prisma.user.findUnique({ where: { email } });
        if(exist) {
            return { status: 'error', message: 'Email already exist' };
        }

        const hash = await hashPassword(password);
        const userCreated = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hash,
            },
        });
        await session.destroySession()
        const res = await auth.login(userCreated);
        const sessionInfo = session.sessionInfo
        let wsToken = '';
        if (sessionInfo) wsToken = await generateWsToken(sessionInfo, Number(userCreated.id))
        if(token) await inventionAccept(token, Number(userCreated.id))
        return { status: (res ? 'success':'error'), user: User.serialize(userCreated), wsUrl: wsToken ? `ws://${configApp.host}:${configApp.port}/websocket/${wsToken}`: '' };

    },
    async login(context: HttpContext){

        const { httpData, responseData, auth, session, logger } = context;
        logger.info('login handler');
        const { email , password , token } = httpData.payload;
        const user = await prisma.user.findUnique({ where: { email } });
        if(user){
            const valid = await validatePassword(password, user.password);
            if (valid) {
                const res = await auth.login(user);
                const sessionInfo = session.sessionInfo
                logger.info(sessionInfo);

                let wsToken = '';
                if (sessionInfo) wsToken = await generateWsToken(sessionInfo, Number(user.id))
                if (token) await inventionAccept(token, Number(user.id))

                return { status: (res ? 'success':'error'), user: User.serialize(user), wsUrl: wsToken ? `ws://${configApp.host}:${configApp.port}/websocket/${wsToken}`: '' };
            }
        }
        logger.info('unauthorized');
        responseData.status = 401;
        return 'unauthorized';
    },
    async logout(context: HttpContext){
        const { auth, logger } = context;
        logger.info('logout handler');
        const res = await auth.logout();
        return { status: (res ? 'success':'error')}
    }
}
