exports.up = function(knex) {
  return knex.schema.alterTable('services', function(table) {
    table.boolean('statement_enrolled').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('services', function(table) {
    table.dropColumn('statement_enrolled');
  });
}; 