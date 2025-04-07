exports.up = function(knex) {
  return knex.schema.createTable('services', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('department_id').notNullable();
    table.string('name', 255).notNullable();
    table.string('url', 1000).notNullable();
    table.uuid('service_owner_id').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('department_id')
      .references('id')
      .inTable('departments');
    
    table.foreign('service_owner_id')
      .references('id')
      .inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('services');
}; 