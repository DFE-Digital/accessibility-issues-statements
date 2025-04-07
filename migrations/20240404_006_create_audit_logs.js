exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.string('action_type', 20).notNullable()
      .checkIn(['create', 'update', 'delete', 'login', 'logout', 'register']);
    table.uuid('user_id').notNullable();
    table.uuid('department_id').notNullable();
    table.string('entity_type', 20).notNullable()
      .checkIn(['user', 'department', 'service', 'issue', 'comment']);
    table.uuid('entity_id').notNullable();
    table.text('changes').nullable(); // Store JSON as text in MSSQL
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id')
      .references('id')
      .inTable('users');
    
    table.foreign('department_id')
      .references('id')
      .inTable('departments');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
}; 