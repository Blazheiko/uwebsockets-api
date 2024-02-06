import vine from '@vinejs/vine';

export default {
    register: vine.object({
        username: vine.string().minLength(1).minLength(100),
        email: vine.string().email().maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),
    login: vine.object({
        email: vine.string().email().maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),
};
