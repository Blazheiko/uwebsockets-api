import logger from '#logger';
import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';

export default {
    async register({ httpData }: HttpContext) {
        logger.info('register handler');
        const {name , email , password} = httpData.payload;
        const hash = await hashPassword(password);

        const user = await User.create({
            name: name,
            email: email,
            password: hash,
        });
        return { status: 'ok', user: User.serialize(user) };

    },
    async login({ httpData , responseData}: HttpContext){
        logger.info('login handler');
        const { email , password } = httpData.payload;
        const user = await User.query()
            .where('email','=', email)
            .first();
        if(user){
            const valid = await validatePassword(password, user.password);
            if(valid) return { status: 'ok',  user: User.serialize(user) };
        }

        responseData.status = 401;
        return 'unauthorized';

    }
}