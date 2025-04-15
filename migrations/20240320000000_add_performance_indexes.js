exports.up = function(knex) {
  return Promise.all([
    knex.schema.alterTable('issues', table => {
      table.index('service_id');
      table.index('status');
      table.index('created_at');
    }),
    knex.schema.alterTable('issue_wcag_criteria', table => {
      table.index('issue_id');
    }),
    knex.schema.alterTable('issue_types', table => {
      table.index('issue_id');
    }),
    knex.schema.alterTable('services', table => {
      table.index('department_id');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.alterTable('issues', table => {
      table.dropIndex('service_id');
      table.dropIndex('status');
      table.dropIndex('created_at');
    }),
    knex.schema.alterTable('issue_wcag_criteria', table => {
      table.dropIndex('issue_id');
    }),
    knex.schema.alterTable('issue_types', table => {
      table.dropIndex('issue_id');
    }),
    knex.schema.alterTable('services', table => {
      table.dropIndex('department_id');
    })
  ]);
}; 