/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('api_requests', function(table) {
        table.increments('id').primary();
        table.integer('api_key_id').unsigned().references('id').inTable('api_keys').onDelete('SET NULL');
        table.string('path').notNullable();
        table.string('method').notNullable();
        table.integer('status');
        table.string('ip_address');
        table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('api_requests');
};