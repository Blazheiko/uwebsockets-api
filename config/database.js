import { env } from "node:process";
export default {
    /* eslint-disable no-undef */
    client: env.DB_CONNECTION,
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB_NAME,
};
