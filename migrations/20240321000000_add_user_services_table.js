exports.up = function(knex) {
  return knex.schema.createTable('user_services', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('user_id').notNullable();
    table.uuid('service_id').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.foreign('service_id')
      .references('id')
      .inTable('services')
      .onDelete('CASCADE');

    // Unique constraint
    table.unique(['user_id', 'service_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_services');
}; 