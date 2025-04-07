exports.up = function(knex) {
  return knex.schema.createTable('service_audit_logs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('service_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('action', 50).notNullable();
    table.json('data').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('service_id')
      .references('id')
      .inTable('services');
    
    table.foreign('user_id')
      .references('id')
      .inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('service_audit_logs');
}; 