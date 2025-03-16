import { Auth, HttpContext, HttpData, ResponseData, Session } from '../types/types.js';

const getDefaultSession = (): Session => ({
        sessionInfo: null,
        updateSessionData: () => null,
        changeSessionData: () => null,
        destroySession: () => 0,
    })
const getDefaultAuth = (): Auth => ({
        getUserId: () => null,
        check: () => false,
        login: () => false,
        logout: () => false,
        logoutAll: () => false,
    })

const session: Session =  getDefaultSession();
const auth: any = getDefaultAuth();
export default ( httpData: HttpData, responseData: ResponseData ): HttpContext => ({
    httpData,
    responseData,
    session ,
    auth
});