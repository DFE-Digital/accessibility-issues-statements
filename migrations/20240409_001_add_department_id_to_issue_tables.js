exports.up = function(knex) {
  return knex.schema
    .alterTable('issue_types', function(table) {
      table.uuid('department_id').nullable();
    })
    .alterTable('issue_wcag_criteria', function(table) {
      table.uuid('department_id').nullable();
    })
    .then(() => {
      return knex.raw(`
        UPDATE it
        SET department_id = s.department_id
        FROM issue_types it
        INNER JOIN issues i ON it.issue_id = i.id
        INNER JOIN services s ON i.service_id = s.id
      `);
    })
    .then(() => {
      return knex.raw(`
        UPDATE iwc
        SET department_id = s.department_id
        FROM issue_wcag_criteria iwc
        INNER JOIN issues i ON iwc.issue_id = i.id
        INNER JOIN services s ON i.service_id = s.id
      `);
    })
    .then(() => {
      return knex.raw(`
        ALTER TABLE issue_types ALTER COLUMN department_id uniqueidentifier NOT NULL;
        ALTER TABLE issue_wcag_criteria ALTER COLUMN department_id uniqueidentifier NOT NULL;
      `);
    })
    .then(() => {
      return knex.schema
        .alterTable('issue_types', function(table) {
          table.foreign('department_id')
            .references('id')
            .inTable('departments');
        })
        .alterTable('issue_wcag_criteria', function(table) {
          table.foreign('department_id')
            .references('id')
            .inTable('departments');
        });
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('issue_types', function(table) {
      table.dropForeign('department_id');
      table.dropColumn('department_id');
    })
    .alterTable('issue_wcag_criteria', function(table) {
      table.dropForeign('department_id');
      table.dropColumn('department_id');
    });
}; 