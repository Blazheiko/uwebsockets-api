import db from '#database/db.js';
import { DateTime } from 'luxon';
import { serializeModel } from '../../vendor/utils/model.js';

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
    create(payload) {
        if (!payload || typeof payload !== 'object')
            throw new Error('Payload must be object');
        const keys = Object.keys(payload);
        required.forEach((field) => {
            if (!keys.includes(field))
                throw new Error(`Field ${field} required`);
        });
        return db.table(TABLE_NAME).insert({
            ...payload,
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
