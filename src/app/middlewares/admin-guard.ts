import type { HttpContext, Middleware } from '#vendor/types/types.js';
import { userRepository } from '#app/repositories/index.js';

const adminGuard: Middleware = async (context: HttpContext, next: () => Promise<void>): Promise<void> => {
    const userId = context.auth.getUserId();
    if (userId === null) {
        context.responseData.status = 403;
        context.responseData.payload = { status: 'forbidden', message: 'Admin access required' };
        return;
    }
    const user = await userRepository.findById(BigInt(userId));
    if (user?.role !== 'admin') {
        context.responseData.status = 403;
        context.responseData.payload = { status: 'forbidden', message: 'Admin access required' };
        return;
    }
    await next();
};

export default adminGuard;
