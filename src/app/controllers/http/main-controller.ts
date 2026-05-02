import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { mainService } from '#app/services/main-service.js';
import { resolveBrowserLanguageFromHeader } from '#app/services/shared/browser-language.js';
import type {
    PingResponse,
    TestRouteResponse,
    InitResponse,
    TestHeadersResponse,
    GetSetCookiesResponse,
    TestSessionResponse,
    SaveUserResponse,
    TestApiSessionResponse,
    IndexResponse,
    TestParamsResponse,
    SetHeaderAndCookieResponse,
    TestMiddlewareResponse,
    UpdateWsTokenResponse,
    WebrtcIceConfigResponse,
} from 'shared';
import type { SaveUserInput } from 'shared/schemas';

export default {
    async ping(): Promise<PingResponse> {
        return mainService.ping().data;
    },

    async testRoute(): Promise<TestRouteResponse> {
        return mainService.testRoute().data;
    },

    async testHeaders({ httpData, logger }: HttpContext): Promise<TestHeadersResponse> {
        logger.info('testHeaders');
        return mainService.testHeaders(httpData).data as TestHeadersResponse;
    },

    async getSetCookies({ httpData, logger }: HttpContext): Promise<GetSetCookiesResponse> {
        logger.info('testCookies');
        return mainService.getSetCookies(httpData).data as GetSetCookiesResponse;
    },

    async testSession({ session, httpData, logger }: HttpContext): Promise<TestSessionResponse> {
        logger.info('testSession');
        return mainService.testSession(httpData, session?.sessionInfo ?? null)
            .data as TestSessionResponse;
    },

    async testApiSession({ session, httpData, logger }: HttpContext): Promise<TestApiSessionResponse> {
        logger.info('testApiSession');
        return mainService.testApiSession(httpData, session?.sessionInfo ?? null).data;
    },

    async index({ httpData, responseData }: HttpContext): Promise<IndexResponse> {
        return mainService.index(httpData, responseData).data;
    },

    async testParams({ httpData }: HttpContext): Promise<TestParamsResponse> {
        return mainService.testParams(httpData).data;
    },

    async updateWsToken({ responseData, session, logger }: HttpContext): Promise<UpdateWsTokenResponse> {
        logger.info('updateWsToken');

        const result = await mainService.updateWsToken(session?.sessionInfo ?? null);
        if (result.data.status === 'unauthorized') {
            responseData.status = 401;
        }

        return result.data as UpdateWsTokenResponse;
    },

    async getWebrtcIceConfig({ responseData, session, logger }: HttpContext): Promise<WebrtcIceConfigResponse> {
        logger.info('getWebrtcIceConfig');

        const result = await mainService.getWebrtcIceConfig(session?.sessionInfo ?? null);
        if (result.data.status === 'unauthorized') {
            responseData.status = 401;
        }
        if (result.data.status === 'error') {
            responseData.status = 503;
        }

        return result.data as WebrtcIceConfigResponse;
    },

    async init({ responseData, session, logger, httpData }: HttpContext): Promise<InitResponse> {
        logger.info('init');

        const browserLanguage = resolveBrowserLanguageFromHeader(
            httpData.headers.get('accept-language'),
        );
        const result = await mainService.init(session?.sessionInfo ?? null, browserLanguage);
        if (result.data.status === 'unauthorized') {
            responseData.status = 401;
        }

        return result.data as InitResponse;
    },

    async setHeaderAndCookie({ responseData, logger }: HttpContext): Promise<SetHeaderAndCookieResponse> {
        logger.info('set-header-and-cookie');
        return mainService.setHeaderAndCookie(responseData).data;
    },

    async testMiddleware({ responseData, logger }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware controller');
        return mainService.testMiddleware(responseData).data as TestMiddlewareResponse;
    },

    async testMiddleware2({ responseData, logger }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware2 controller');
        return mainService.testMiddleware(responseData).data as TestMiddlewareResponse;
    },

    async testMiddleware3({ responseData, logger }: HttpContext): Promise<TestMiddlewareResponse> {
        logger.info('testMiddleware3 controller');
        return mainService.testMiddleware(responseData).data as TestMiddlewareResponse;
    },

    async saveUser(context: HttpContext<SaveUserInput>): Promise<SaveUserResponse> {
        context.logger.info('saveUser');
        const payload = getTypedPayload(context);
        const result = await mainService.saveUser(payload);
        return result.data as SaveUserResponse;
    },
};
