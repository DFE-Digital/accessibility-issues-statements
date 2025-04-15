exports.up = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.timestamp('closed_date').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.dropColumn('closed_date');
  });
}; 