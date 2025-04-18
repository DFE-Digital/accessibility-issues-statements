exports.up = function(knex) {
  return knex.schema.createTable('issue_resources', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('issue_id').notNullable().references('id').inTable('issues').onDelete('CASCADE');
    table.uuid('department_id').notNullable().references('id').inTable('departments').onDelete('CASCADE');
    table.string('type', 255).notNullable();
    table.text('value').notNullable();
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Add indexes
    table.index('issue_id');
    table.index('department_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('issue_resources');
}; 