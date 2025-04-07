exports.up = function(knex) {
  return knex.schema
    // Create departments table
    .createTable('departments', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.string('name', 255).notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    })
    // Create department_allowed_domains table
    .then(function() {
      return knex.schema.createTable('department_allowed_domains', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
        table.uuid('department_id').notNullable();
        table.string('domain', 255).notNullable();
        table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
        table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
        
        // Foreign key constraint
        table.foreign('department_id')
          .references('id')
          .inTable('departments')
          .onDelete('CASCADE');
          
        // Unique constraint on department_id + domain
        table.unique(['department_id', 'domain']);
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('department_allowed_domains')
    .dropTableIfExists('departments');
}; 