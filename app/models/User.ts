import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/model.js';
import logger from '#logger';

const schema = {
    isAdmin: (value: number | string) => Boolean(Number(value)),
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};
//const fields = ['name', 'password', 'email'];
const required = ['name', 'password', 'email'];
const hidden = ['password', 'isAdmin'];

export default {
    async create(payload: any) {
        logger.info('create user');
        // console.log(payload);
        if (!payload || typeof payload !== 'object')
            return new Error('Payload must be object');
        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        // Check phone uniqueness during creation
        if (payload.phone) {
            const existingUser = await prisma.user.findFirst({
                where: { phone: payload.phone }
            });
            if (existingUser) {
                throw new Error('Phone number already exists');
            }
        }

        const user = await prisma.user.create({
            data: {
                name: payload.name,
                password: payload.password,
                email: payload.email,
                phone: payload.phone || null,
            }
        });
        // return user;
        return serializeModel(user, schema, hidden);
    },

    async findById(id: number) {
        logger.info(`find user by id: ${id}`);
        const user = await prisma.user.findUnique({
            where: { id }
        });
        
        if (!user) {
            throw new Error(`User with id ${id} not found`);
        }
        
        return serializeModel(user, schema, hidden);
    },

    async update(id: number, payload: any) {
        const updateData = {
            ...payload,
            updatedAt: DateTime.now().toISO(),
        };

        // Check phone uniqueness during update
        if (payload.phone) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    phone: payload.phone,
                    NOT: { id } // Exclude current user
                }
            });
            if (existingUser) {
                throw new Error('Phone number already exists');
            }
        }

        if (payload.phone === undefined) {
            delete updateData.phone;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });
        return serializeModel(user, schema, hidden);
    },

    async delete(id: number) {
        logger.info(`delete user with id: ${id}`);
        const result = await prisma.user.delete({
            where: { id }
        });
        return result;
    },

    query() {
        return prisma.user;
    },
    serialize(user: any) {
        return serializeModel(user, schema, hidden);
    },
    serializeArray(users: any) {
        return users.map((user: any) => serializeModel(user, schema, hidden));
    },
};
