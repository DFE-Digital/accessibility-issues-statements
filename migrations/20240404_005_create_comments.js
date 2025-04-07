exports.up = function(knex) {
  return knex.schema.createTable('comments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
    table.uuid('issue_id').notNullable();
    table.uuid('user_id').notNullable();
    table.text('content').notNullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('issue_id')
      .references('id')
      .inTable('issues')
      .onDelete('CASCADE');
    
    table.foreign('user_id')
      .references('id')
      .inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('comments');
}; 