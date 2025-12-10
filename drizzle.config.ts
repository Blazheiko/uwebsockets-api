import { defineConfig } from 'drizzle-kit';
import dbConfig from '#config/database.js';

export default defineConfig({
    schema: './database/schema.ts',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        host: dbConfig.host || '127.0.0.1',
        port: dbConfig.port || 3306,
        user: dbConfig.user || 'root',
        // Only include password if it's set
        ...(dbConfig.password ? { password: dbConfig.password } : {}),
        database: dbConfig.database || 'uapi',
    },
    migrations: {
        table: "__drizzle_migrations",
        schema: "drizzle", // по умолчанию schema=drizzle в PostgreSQL
      },
    verbose: true,
    strict: true,
});
