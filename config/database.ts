import { env } from "node:process";
export default Object.freeze({
    /* eslint-disable no-undef */
    client: env.DB_CONNECTION,
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT) || 3306,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB_NAME,
});
