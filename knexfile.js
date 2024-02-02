// Update with your config settings.

import configDB from '#config/database.js';

const config = {
    client: 'mysql2',
    connection: {
        host: configDB.host ? configDB.host : '127.0.0.1',
        port: configDB.port ? configDB.port : 3306,
        user: configDB.user ? configDB.user : 'root',
        password: configDB.password ? configDB.password : '',
        database: configDB.database ? configDB.database : 'cab',
    },
    migrations: {
        directory: './database/migrations',
    },
    seeds: {
        directory: './database/seeds',
    },
};

export default config;
