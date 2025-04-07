exports.up = function(knex) {
  return knex.schema.table('comments', function(table) {
    table.string('type').defaultTo('comment');
  });
};

exports.down = function(knex) {
  return knex.schema.table('comments', function(table) {
    table.dropColumn('type');
  });
}; 