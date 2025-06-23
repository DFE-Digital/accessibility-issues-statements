/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('api_keys', function(table) {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('token').unique().notNullable();
        table.datetime('expires_at');
        table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('api_keys');
};