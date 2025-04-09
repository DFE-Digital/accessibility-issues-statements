exports.up = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.uuid('assigned_to').nullable();
    table.foreign('assigned_to')
      .references('id')
      .inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.dropForeign('assigned_to');
    table.dropColumn('assigned_to');
  });
}; 