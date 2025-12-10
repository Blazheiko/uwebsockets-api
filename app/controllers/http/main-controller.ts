import userModel from '#app/models/User.js';
import { HttpContext } from './../../../vendor/types/types.js';
import configApp from '#config/app.js';
import generateWsToken from '#app/servises/generate-ws-token.js';
import type {
    PingResponse,
    TestRouteResponse,
    InitResponse,
    TestHeadersResponse,
    GetSetCookiesResponse,
    TestSessionResponse,
    SaveUserResponse,
    TestMiddlewareResponse,
    UpdateWsTokenResponse,
} from '../types/MainController.js';
// import middlewares from '#app/middlewares/kernel.js';
import getWsUrl from '#app/servises/getWsUrl.js';

export default {
    // async joinСhat({ httpData, logger }: HttpContext): Promise<any> {
    //     logger.info('MainController.joinСhat');
    //     const { token } = httpData.params as { token: string };
    //     logger.info(token);
    //     const invitation = await prisma.invitation.findUnique({ where: { token } });
    //     console.log(invitation);

    //     return { status: 'ok' };
    // },

    async ping(): Promise<PingResponse> {
        return { status: 'ok' };
    },

    async testRoute(): Promise<TestRouteResponse> {
        return { status: 'ok' };
    },

    async testHeaders({
        httpData,
        logger,
    }: HttpContext): Promise<TestHeadersResponse> {
        logger.info('testHeaders');
        logger.info(httpData.params);
        const headers: Array<{ key: string; value: string }> = [];
        const params: any[] = httpData.params;
        httpData.headers.forEach((value, key) => {
            headers.push({ key, value });
        });
        return { status: 'ok', headers, params };
    },

    async getSetCookies({
        httpData,
        logger,
    }: HttpContext): Promise<GetSetCookiesResponse> {
        logger.info('testCookies');
        const cookies: Array<{ key: string; value: string }> = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value });
        });

        return { status: 'ok', cookies };
    },
    async testSession({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<TestSessionResponse> {
        logger.info('testSession');
        logger.info(session);
        const cookies: Array<{ key: string; value: string }> = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value });
        });
        const sessionInfo = session?.sessionInfo;

        return { status: 'ok', cookies, sessionInfo };
    },
    async testApiSession({
        session,
        httpData,
        logger,
    }: HttpContext): Promise<any> {
        logger.info('testApiSession');
        const headers: any[] = [];
        httpData.headers.forEach((value, key) => {
            headers.push({ key, value });
        });

        const sessionInfo = session?.sessionInfo;

        return { status: 'ok', headers, sessionInfo };
    },

    async index({ httpData, responseData }: HttpContext): Promise<any> {
        const payload = httpData;
        // eslint-disable-next-line no-undef
        console.log(responseData);
        return { payload, responseData };
    },
    async testParams({ httpData }: HttpContext): Promise<any> {
        const params = httpData.params;
        const query = httpData.query.getAll('test');
        console.log('testParams');
        return { params, query, status: 'ok' };
    },

    async updateWsToken({
        responseData,
        session,
        logger,
    }: HttpContext): Promise<UpdateWsTokenResponse> {
        logger.info('updateWsToken');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            responseData.status = 401;
            return { status: 'unauthorized', message: 'Session not found', wsUrl: '' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            responseData.status = 401;
            return { status: 'unauthorized', message: 'Session expired', wsUrl: '' };
        }
        
        let wsToken = '';
        if (sessionInfo)
            wsToken = await generateWsToken(sessionInfo, Number(userId));
        return { status: 'ok', wsUrl: wsToken ? getWsUrl(wsToken) : '' };
    },
    async init({
        responseData,
        session,
        logger,
    }: HttpContext): Promise<InitResponse> {
        logger.info('init');
        const sessionInfo = session?.sessionInfo;
        if (!sessionInfo) {
            return { status: 'error', message: 'Session not found' };
        }
        const userId = sessionInfo.data?.userId;
        if (!userId) {
            responseData.status = 401;
            return { status: 'unauthorized', message: 'Session expired' };
        }
        const user = await userModel.findById(BigInt(userId));
        if (!user) {
            return { status: 'unauthorized', message: 'Session expired' };
        }
        let wsToken = '';
        if (sessionInfo)
            wsToken = await generateWsToken(sessionInfo, Number(user.id));
        // const token = generateKey(configApp.characters, 16);
        // await redis.setex(
        //     `auth:ws:${token}`,
        //     60,
        //     JSON.stringify({ sessionId: sessionInfo.id, userId: user.id }),
        // );

        return {
            status: 'ok',
            user: userModel.serialize(user),
            wsUrl: wsToken ? getWsUrl(wsToken) : '',
        };
    },

    async setHeaderAndCookie({
        responseData,
        logger,
    }: HttpContext): Promise<any> {
        logger.info('set-header-and-cookie');
        responseData.headers.push({ name: 'test-header', value: 'test' });
        responseData.setCookie({
            name: 'cookieTest1',
            value: 'test',
            path: '/',
            httpOnly: true,
            secure: false,
            maxAge: 3600,
        });
        responseData.setCookie('cookieTest2', 'test');
        return { status: 'ok' };
    },
    async testMiddleware({
        responseData,
        logger,
    }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware controller');
        return { middlewares: responseData.middlewareData, status: 'ok' };
    },
    async testMiddleware2({
        responseData,
        logger,
    }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware2 controller');
        return { middlewares: responseData.middlewareData, status: 'ok' };
    },
    async testMiddleware3({
        responseData,
        logger,
    }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware3 controller');
        return { middlewares: responseData.middlewareData, status: 'ok' };
    },
    async saveUser({
        httpData,
        logger,
    }: HttpContext): Promise<SaveUserResponse> {
        logger.info('saveUser');
        const { payload } = httpData;
        const user = await userModel.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });
        return { status: 'ok', user };
    },
};
