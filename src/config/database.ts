import { env } from "node:process";
export default Object.freeze({
  client: env["DB_CONNECTION"],
  host: env["PGSQL_HOST"],
  port: Number(env["PGSQL_PORT"]) ?? 5432,
  user: env["PGSQL_USER"],
  password: env["PGSQL_PASSWORD"],
  database: env["PGSQL_DB_NAME"],
});
