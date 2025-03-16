import logger from '#logger';
import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';
import sessionHandler from '../../../vendor/utils/sessionHandler.js';

export default {
    async register(context: HttpContext) {
        logger.info('register handler');
        const { httpData } = context;
        const {name , email , password} = httpData.payload;
        const hash = await hashPassword(password);

        const user = await User.create({
            name: name,
            email: email,
            password: hash,
        });

        await sessionHandler( context, '', `${user.id}`)
        return { status: 'ok', user: User.serialize(user) };

    },
    async login(context: HttpContext){
        logger.info('login handler');
        const { httpData, responseData } = context;
        const { email , password } = httpData.payload;
        const user = await User.query()
            .where('email','=', email)
            .first();
        if(user){
            const valid = await validatePassword(password, user.password);
            if (valid) {
                await sessionHandler( context, '', `${user.id}`)
                return { status: 'ok', user: User.serialize(user) };
            }
        }

        responseData.status = 401;
        return 'unauthorized';

    }
}