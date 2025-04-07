exports.up = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.boolean('planned_fix').defaultTo(false);
    table.date('planned_fix_date').nullable();
    table.text('not_fixing_reason').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('issues', function(table) {
    table.dropColumn('planned_fix');
    table.dropColumn('planned_fix_date');
    table.dropColumn('not_fixing_reason');
  });
}; 