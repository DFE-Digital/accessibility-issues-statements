/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('api_keys', function(table) {
        table.uuid('department_id').nullable().references('id').inTable('departments').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('api_keys', function(table) {
        table.dropColumn('department_id');
    });
};