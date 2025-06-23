require('dotenv').config();

module.exports = {
    development: {
        client: 'mssql',
        connection: {
            server: process.env.DB_SERVER,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: process.env.DB_ENCRYPT === 'true',
                trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            }
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations'
        }
    },

    production: {
        client: 'mssql',
        connection: {
            server: process.env.DB_SERVER,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: process.env.DB_ENCRYPT === 'true',
                trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            }
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations'
        }
    }
};