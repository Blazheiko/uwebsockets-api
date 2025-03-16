import logger from '#logger';
import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';

export default {
    async register(context: HttpContext) {
        logger.info('register handler');
        const { httpData, auth, session } = context;
        const {name , email , password} = httpData.payload;
        const hash = await hashPassword(password);

        const user = await User.create({
            name: name,
            email: email,
            password: hash,
        });
        await session.destroySession()
        const res = await auth.login(user);
        return { status: (res ? 'success':'error'), user: User.serialize(user) };

    },
    async login(context: HttpContext){
        logger.info('login handler');
        const { httpData, responseData, auth } = context;
        const { email , password } = httpData.payload;
        const user = await User.query()
            .where('email','=', email)
            .first();
        if(user){
            const valid = await validatePassword(password, user.password);
            if (valid) {
                const res = await auth.login(user);
                return { status: (res ? 'success':'error'), user: User.serialize(user) };
            }
        }
        responseData.status = 401;
        return 'unauthorized';
    },
    async logout(context: HttpContext){
        logger.info('logout handler');
        const { auth } = context;
        const res = await auth.logout();
        return { status: (res ? 'success':'error')}
    }
}