import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';
// import configSession from '#config/session.js';
import configApp from '#config/app.js';
import { prisma } from '#database/prisma.js';
import inventionAccept from '#app/servises/invention-accept.js';
import generateWsToken from '#app/servises/generate-ws-token.js';
import type {
    RegisterResponse,
    LoginResponse,
    LogoutResponse,
} from '../types/AuthController.js';

export default {
    async register(context: HttpContext): Promise<RegisterResponse> {
        const { httpData, auth, session, logger } = context;
        logger.info('register handler');
        const { name, email, password, token } = httpData.payload;
        const exist = await prisma.user.findUnique({ where: { email } });
        if (exist) {
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
        await session.destroySession();
        const res = await auth.login(userCreated);
        const sessionInfo = session.sessionInfo;
        let wsToken = '';
        if (sessionInfo)
            wsToken = await generateWsToken(
                sessionInfo,
                Number(userCreated.id),
            );
        if (token) await inventionAccept(token, Number(userCreated.id));
        return {
            status: res ? 'success' : 'error',
            user: User.serialize(userCreated),
            wsUrl: wsToken
                ? `ws://${configApp.domain}/websocket/${wsToken}`
                : '',
        };
    },
    async login(context: HttpContext): Promise<LoginResponse | string> {
        const { httpData, responseData, auth, session, logger } = context;
        logger.info('login handler');
        const { email, password, token } = httpData.payload;

        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            const valid = await validatePassword(password, user.password);
            if (valid) {
                const res = await auth.login(user);
                const sessionInfo = session.sessionInfo;
                logger.info(sessionInfo);

                let wsToken = '';
                if (sessionInfo)
                    wsToken = await generateWsToken(
                        sessionInfo,
                        Number(user.id),
                    );
                if (token) await inventionAccept(token, Number(user.id));

                return {
                    status: res ? 'success' : 'error',
                    user: User.serialize(user),
                    wsUrl: wsToken
                        ? `ws://${configApp.domain}/websocket/${wsToken}`
                        : '',
                };
            }
        }
        logger.info('unauthorized');
        responseData.status = 401;
        return 'unauthorized';
    },
    async logout(context: HttpContext): Promise<LogoutResponse> {
        const { auth, logger } = context;
        logger.info('logout handler');
        const res = await auth.logout();
        return { status: res ? 'success' : 'error' };
    },
    async logoutAll(context: HttpContext): Promise<LogoutResponse> {
        const { auth, logger } = context;
        logger.info('logoutAll handler');
        const res = await auth.logoutAll();
        return { status: res ? 'success' : 'error', deletedCount: res };
    },
};
