exports.up = function(knex) {
  return knex.schema.createTable('service_users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('service_id').notNullable();
    table.uuid('user_id').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('service_id')
      .references('id')
      .inTable('services')
      .onDelete('CASCADE');
    
    table.foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Unique constraint
    table.unique(['service_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('service_users');
}; 