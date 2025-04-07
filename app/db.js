const knex = require('knex');
const config = require('../knexfile');

// Create a database connection using the development configuration
const db = knex(config.development);

// Export the database connection
module.exports = { db }; 