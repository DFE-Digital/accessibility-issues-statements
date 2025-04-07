exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.timestamp('last_login').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('last_login');
  });
}; 