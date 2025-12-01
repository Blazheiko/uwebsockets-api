import { defineConfig } from 'drizzle-kit';
import { env } from 'node:process';
import { config } from 'dotenv';

config();

export default defineConfig({
    schema: './database/schema.ts',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        host: env.MYSQL_HOST || 'localhost',
        port: Number(env.MYSQL_PORT) || 3306,
        user: env.MYSQL_USER || 'root',
        password: env.MYSQL_PASSWORD || '',
        database: env.MYSQL_DB_NAME || 'test',
    },
    verbose: true,
    strict: true,
});

