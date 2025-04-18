exports.up = function(knex) {
  return knex.schema.table('departments', function(table) {
    table.string('brand').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('departments', function(table) {
    table.dropColumn('brand');
  });
}; 