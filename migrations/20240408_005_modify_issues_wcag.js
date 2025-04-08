exports.up = function(knex) {
  return knex.schema
    .createTable('issue_wcag_criteria', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.uuid('issue_id').notNullable();
      table.string('wcag_criterion').nullable();
      table.foreign('issue_id').references('id').inTable('issues')
        .onDelete('CASCADE');
    })
    .createTable('issue_types', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.uuid('issue_id').notNullable();
      table.string('type', 20).notNullable()
        .checkIn(['wcag', 'best_practice', 'usability', 'not_known']);
      table.foreign('issue_id').references('id').inTable('issues')
        .onDelete('CASCADE');
      // Prevent duplicate types for the same issue
      table.unique(['issue_id', 'type']);
    })
    .alterTable('issues', function(table) {
      // Drop old columns
      table.dropColumn('wcag_criteria');
      table.dropColumn('wcag_criterion');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('issue_types')
    .dropTableIfExists('issue_wcag_criteria')
    .alterTable('issues', function(table) {
      table.string('wcag_criteria', 1000);
      table.string('wcag_criterion', 20);
    });
}; 