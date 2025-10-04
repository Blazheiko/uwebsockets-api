import { HttpContext } from '../../types/types.js';

const authGuard = async (context: HttpContext, next: Function) => {

    const {  auth } = context;
    if (!auth?.check()) {
        context.responseData.status = 401;
        context.responseData.payload = { status: 'unauthorized', message: 'Unauthorized' };
        return;
    }

    // if (!session.sessionInfo?.data?.userId) {
    //     context.responseData.status = 401;
    //     context.responseData.payload = { status: 'error', message: 'Unauthorized' };
    //     return;
    // }

    await next()
};

export default authGuard;