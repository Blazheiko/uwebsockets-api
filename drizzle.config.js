import { defineConfig } from "drizzle-kit";

const dbConfig = {
  host: process.env.PGSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.PGSQL_PORT ?? 5432),
  user: process.env.PGSQL_USER ?? "postgres",
  password: process.env.PGSQL_PASSWORD ?? "",
  database: process.env.PGSQL_DB_NAME ?? "itvibe",
};

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    ...(dbConfig.password ? { password: dbConfig.password } : {}),
    database: dbConfig.database,
    ssl: false,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  verbose: true,
  strict: true,
});
