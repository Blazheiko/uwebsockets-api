import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';
import configApp from '#config/app.js';
import { db } from '#database/db.js';
import { users } from '#database/schema.js';
import { eq } from 'drizzle-orm';
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

        const exist = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (exist.length > 0) {
            return { status: 'error', message: 'Email already exist' };
        }

        const hash = await hashPassword(password);
        const now = new Date();
        const [result] = await db.insert(users).values({
            name: name,
            email: email,
            password: hash,
            createdAt: now,
            updatedAt: now,
        });

        const userCreated = await db
            .select()
            .from(users)
            .where(eq(users.id, BigInt(result.insertId)))
            .limit(1);

        await session.destroySession();
        const res = await auth.login(userCreated[0]);
        const sessionInfo = session.sessionInfo;
        let wsToken = '';
        if (sessionInfo)
            wsToken = await generateWsToken(
                sessionInfo,
                Number(userCreated[0].id),
            );
        if (token) await inventionAccept(token, Number(userCreated[0].id));
        return {
            status: res ? 'success' : 'error',
            user: User.serialize(userCreated[0]),
            wsUrl: wsToken ? getWsUrl(wsToken) : '',
        };
    },
    async login(context: HttpContext): Promise<LoginResponse | string> {
        const { httpData, responseData, auth, session, logger } = context;
        logger.info('login handler');
        const { email, password, token } = httpData.payload;

        const userData = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (userData.length > 0) {
            const user = userData[0];
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
