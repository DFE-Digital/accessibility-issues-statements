exports.up = function(knex) {
  return knex.schema.createTable('issues', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('service_id').notNullable();
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('status', 20).notNullable().defaultTo('open')
      .checkIn(['open', 'in_progress', 'resolved', 'closed']);
    table.string('risk_level', 20).notNullable()
      .checkIn(['high', 'high_medium', 'medium', 'low']);
    table.string('wcag_criteria', 1000).notNullable();
    table.string('source_of_discovery', 255).notNullable();
    table.uuid('created_by').notNullable();
    table.uuid('assigned_to').nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('service_id')
      .references('id')
      .inTable('services');
    
    table.foreign('created_by')
      .references('id')
      .inTable('users');
      
    table.foreign('assigned_to')
      .references('id')
      .inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('issues');
}; 