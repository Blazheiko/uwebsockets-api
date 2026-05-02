import 'dotenv/config';
import pg from 'pg';

const dbName = process.env['PGSQL_DB_NAME'] ?? 'itvibe';

const client = new pg.Client({
    host: process.env['PGSQL_HOST'] ?? '127.0.0.1',
    port: Number(process.env['PGSQL_PORT'] ?? 5432),
    user: process.env['PGSQL_USER'] ?? 'postgres',
    password: process.env['PGSQL_PASSWORD'] ?? '',
    database: 'postgres',
});

async function createDatabase(): Promise<void> {
    await client.connect();

    const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
    );

    if (result.rowCount === 0) {
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log(`Database "${dbName}" created successfully.`);
    } else {
        console.log(`Database "${dbName}" already exists.`);
    }

    await client.end();
}

createDatabase().catch((err: unknown) => {
    console.error('Failed to create database:', err);
    process.exit(1);
});
