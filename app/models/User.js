import db from '#database/db.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/model.js';
import logger from "#logger";

const TABLE_NAME = 'users';
const schema = {
    isAdmin: (value) => Boolean(Number(value)),
    created_at: (value) => DateTime.fromISO(value).toISO(),
    updated_at: (value) => DateTime.fromISO(value).toISO(),
};
//const fields = ['name', 'password', 'email'];
const required = ['name', 'password', 'email'];
const hidden = ['password'];
export default {
    async create(payload) {
        logger.info('create user')
        if (!payload || typeof payload !== 'object')
            return new Error('Payload must be object');
        const keys = Object.keys(payload);
        required.forEach((field) => {
            if (!keys.includes(field))
                return new Error(`Field ${field} required`);
        });
        return await db.table(TABLE_NAME).insert({
            name: payload.username,
            password: payload.password,
            email: payload.email,
            created_at: DateTime.now().toISO(),
            updated_at: DateTime.now().toISO(),
        });
    },
    update(id, payload) {
        return db
            .table(TABLE_NAME)
            .where('id', '=', id)
            .update({
                ...payload,
                updated_at: DateTime.now().toISO(),
            });
    },
    query() {
        return db.table(TABLE_NAME);
    },
    serialize(user) {
        return serializeModel(user, schema, hidden);
    },
    serializeArray(users) {
        return users.map((user) => serializeModel(user, schema, hidden));
    },
};
