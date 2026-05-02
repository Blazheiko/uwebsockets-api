import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import databaseConfig from '#config/database.js';
import appConfig from '#config/app.js';
import * as schema from './schema.js';

const pool = new pg.Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false,
});

const db = drizzle(pool, {
    schema,
    logger:
        appConfig.env === 'prod' || appConfig.env === 'production'
            ? false
            : true,
});

export { db, pool };
