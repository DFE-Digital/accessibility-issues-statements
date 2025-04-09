exports.up = function(knex) {
  return Promise.all([
    // Create business areas table
    knex.schema.createTable('business_areas', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.string('name').notNullable();
      table.uuid('department_id').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraint
      table.foreign('department_id')
        .references('id')
        .inTable('departments')
        .onDelete('CASCADE');
    }),

    // Create external repositories table
    knex.schema.createTable('service_repositories', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.uuid('service_id').notNullable();
      table.string('url').notNullable();
      table.string('type').notNullable(); // e.g., 'github', 'gitlab', 'bitbucket', etc.
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraint
      table.foreign('service_id')
        .references('id')
        .inTable('services')
        .onDelete('CASCADE');
    }),

    // Add business_area_id to services table
    knex.schema.alterTable('services', function(table) {
      table.uuid('business_area_id')
        .references('id')
        .inTable('business_areas')
        .nullable();
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Remove business_area_id from services
    knex.schema.alterTable('services', function(table) {
      table.dropColumn('business_area_id');
    }),

    // Drop service_repositories table
    knex.schema.dropTable('service_repositories'),

    // Drop business_areas table
    knex.schema.dropTable('business_areas')
  ]);
}; 