import vine from '@vinejs/vine';

const schemas: Record<string, any>= {
    register: vine.object({
        name: vine.string().minLength(1).maxLength(100),
        email: vine.string().email().minLength(1).maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),
    login: vine.object({
        email: vine.string().email().maxLength(255),
        password: vine.string().minLength(8).maxLength(32),
    }),
};

export default schemas;
