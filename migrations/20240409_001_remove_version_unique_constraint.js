exports.up = function(knex) {
  return knex.schema.table('statement_templates', function(table) {
    table.dropUnique(['version']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('statement_templates', function(table) {
    table.unique(['version']);
  });
}; 