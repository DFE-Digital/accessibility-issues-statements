exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.timestamp('last_login').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
    // Only drop last_login if it exists
    return knex.schema.hasColumn('users', 'last_login')
      .then(exists => {
        if (exists) {
          return table.dropColumn('last_login');
        }
      });
  });
}; 