import { db } from '#database/db.js';
import { users } from '#database/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import logger from '#logger';

const schema = {
    isAdmin: (value: number | string) => Boolean(Number(value)),
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};
const required = ['name', 'password', 'email'];
const hidden = ['password', 'isAdmin'];

export default {
    async create(payload: any) {
        logger.info('create user');
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
            const existingUser = await db
                .select()
                .from(users)
                .where(eq(users.phone, payload.phone))
                .limit(1);
            if (existingUser.length > 0) {
                throw new Error('Phone number already exists');
            }
        }

        const now = new Date();
        const [user] = await db.insert(users).values({
            name: payload.name,
            password: payload.password,
            email: payload.email,
            phone: payload.phone || null,
            createdAt: now,
            updatedAt: now,
        });

        const createdUser = await db
            .select()
            .from(users)
            .where(eq(users.id, BigInt(user.insertId)));
        return serializeModel(createdUser[0], schema, hidden);
    },

    async findById(id: bigint) {
        logger.info(`find user by id: ${id}`);
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (user.length === 0) {
            throw new Error(`User with id ${id} not found`);
        }

        return serializeModel(user[0], schema, hidden);
    },

    async findByEmail(email: string) {
        logger.info(`find user by email: ${email}`);
        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (user.length === 0) {
            return null;
        }

        return user[0];
    },

    async update(id: bigint, payload: any) {
        const updateData: any = {
            ...payload,
            updatedAt: new Date(),
        };

        // Check phone uniqueness during update
        if (payload.phone) {
            const existingUser = await db
                .select()
                .from(users)
                .where(and(eq(users.phone, payload.phone), ne(users.id, id)))
                .limit(1);
            if (existingUser.length > 0) {
                throw new Error('Phone number already exists');
            }
        }

        if (payload.phone === undefined) {
            delete updateData.phone;
        }

        await db.update(users).set(updateData).where(eq(users.id, id));
        const updatedUser = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return serializeModel(updatedUser[0], schema, hidden);
    },

    async delete(id: bigint) {
        logger.info(`delete user with id: ${id}`);
        const result = await db.delete(users).where(eq(users.id, id));
        return result;
    },

    query() {
        return db.select().from(users);
    },

    serialize(user: any) {
        return serializeModel(user, schema, hidden);
    },

    serializeArray(usersData: any) {
        return usersData.map((user: any) =>
            serializeModel(user, schema, hidden),
        );
    },
};
