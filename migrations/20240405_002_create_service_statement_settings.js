exports.up = function(knex) {
  return knex.schema
    .createTable('service_statement_settings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.uuid('service_id').references('id').inTable('services').notNullable();
      table.date('last_audit_date');
      table.string('last_audit_by', 255);
      table.string('last_audit_method', 255);
      table.integer('response_time_sla').notNullable().defaultTo(10); // Default 10 working days
      table.string('complaint_contact', 255).notNullable(); // URL or email for complaints
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users').notNullable();
      table.uuid('updated_by').references('id').inTable('users').notNullable();

      // Add unique constraint on service_id as there should only be one settings record per service
      table.unique(['service_id']);
    })
    .createTable('service_contact_methods', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
      table.uuid('service_id').references('id').inTable('services').notNullable();
      table.enum('contact_type', ['email', 'phone', 'online_form']).notNullable();
      table.string('contact_value', 255).notNullable();
      table.integer('display_order').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users').notNullable();
      table.uuid('updated_by').references('id').inTable('users').notNullable();

      // Add unique constraint to prevent duplicate contact types per service
      table.unique(['service_id', 'contact_type']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('service_contact_methods')
    .dropTableIfExists('service_statement_settings');
}; 