/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('services', function(table) {
    table.string('external_id').nullable().comment('External identifier for linking to CMDB or other data sources');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('services', function(table) {
    table.dropColumn('external_id');
  });
};
