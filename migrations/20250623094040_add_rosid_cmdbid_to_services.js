/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('services', function(table) {
        table.string('rosid');
        table.string('cmdbid');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('services', function(table) {
        table.dropColumn('rosid');
        table.dropColumn('cmdbid');
    });
};