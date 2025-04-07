exports.up = function(knex) {
  return knex.schema.createTable('statement_templates', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.string('name').notNullable();
    table.text('content').notNullable();
    table.string('version').notNullable();
    table.boolean('is_active').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users').notNullable();
    table.uuid('updated_by').references('id').inTable('users').notNullable();

    // Add unique constraint on version
    table.unique(['version']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('statement_templates');
}; 