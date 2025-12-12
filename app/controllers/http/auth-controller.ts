import userModel from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';
import inventionAccept from '#app/servises/invention-accept.js';
import generateWsToken from '#app/servises/generate-ws-token.js';
import type {
    RegisterResponse,
    LoginResponse,
    LogoutResponse,
} from '../types/AuthController.js';
import getWsUrl from '#app/servises/getWsUrl.js';

export default {
    async register(context: HttpContext): Promise<RegisterResponse> {
        const { httpData, auth, session, logger } = context;
        logger.info('register handler');
        const { name, email, password, token } = httpData.payload;

        const exist = await userModel.findByEmail(email);
        if (exist) {
            return { status: 'error', message: 'Email already exist' };
        }

        const oldSessionData = session.sessionInfo?.data;

        const hash = await hashPassword(password);

        const userCreated = await userModel.create({
            name: name,
            email: email,
            password: hash,
        });

        // Get raw user data for auth.login
        const rawUser = await userModel.findByEmail(email);
        if (!rawUser) {
            return { status: 'error', message: 'Failed to create user' };
        }

        if (oldSessionData && oldSessionData.inventionToken ) {
            await inventionAccept(oldSessionData.inventionToken, Number(rawUser.id));
            logger.info('inventionAccept register');
        }
        
        await session.destroySession();
        const res = await auth.login(rawUser);
        const sessionInfo = session.sessionInfo;
        let wsToken = '';
        if (sessionInfo)
            wsToken = await generateWsToken(sessionInfo, Number(rawUser.id));
        if (token) await inventionAccept(token, Number(rawUser.id));
        return {
            status: res ? 'success' : 'error',
            user: userCreated,
            wsUrl: wsToken ? getWsUrl(wsToken) : '',
        };
    },
    async login(context: HttpContext): Promise<LoginResponse | string> {
        const { httpData, responseData, auth, session, logger } = context;
        logger.info('login handler');
        const { email, password, token } = httpData.payload;

        const user = await userModel.findByEmail(email);

        if (user) {
            const valid = await validatePassword(password, user.password);
            if (valid) {
                const oldSessionData = session.sessionInfo?.data;
                if (oldSessionData && oldSessionData.inventionToken ) {
                    await inventionAccept(oldSessionData.inventionToken, Number(user.id));
                    logger.info('inventionAccept login');
                }
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
                    user: userModel.serialize(user),
                    wsUrl: wsToken ? getWsUrl(wsToken) : '',
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
