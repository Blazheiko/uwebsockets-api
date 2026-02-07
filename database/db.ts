import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { PoolOptions } from 'mysql2/promise';
import databaseConfig from '#config/database.js';
import appConfig from '#config/app.js';
import * as schema from './schema.js';

// Используем createPool вместо createConnection для надежности
const pool = mysql.createPool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
} as PoolOptions);

const db = drizzle(pool, {
    schema,
    mode: 'default',
    logger:
        appConfig.env === 'prod' || appConfig.env === 'production'
            ? false
            : true,
});

export { db, pool };
