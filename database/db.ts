import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import databaseConfig from '#config/database.js';
import appConfig from '#config/app.js';
import * as schema from './schema.js';

const connection = await mysql.createConnection({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
});

const db = drizzle(connection, {
    schema,
    mode: 'default',
    logger:
        appConfig.env === 'prod' || appConfig.env === 'production'
            ? false
            : true,
});

export { db, connection };
