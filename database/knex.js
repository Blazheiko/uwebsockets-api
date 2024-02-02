import knex from 'knex';
import config from '../config/database.js';

const db = knex({
    client: config.client,
    connection: {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    },
    pool: { min: 0, max: 5 },
});

export default db;
