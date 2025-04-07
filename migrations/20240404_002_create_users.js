exports.up = function(knex) {
  return knex.schema
    // Create user_role type as a check constraint since MSSQL doesn't support ENUMs
    .raw(`
      CREATE TYPE user_role FROM varchar(20) NOT NULL;
    `)
    .then(function() {
      return knex.schema.createTable('users', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('NEWID()'));
        table.string('email', 255).notNullable().unique();
        table.string('role', 20).notNullable().checkIn(['super_admin', 'department_admin', 'service_owner', 'user']);
        table.uuid('department_id').notNullable();
        table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
        table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

        // Foreign key constraint
        table.foreign('department_id')
          .references('id')
          .inTable('departments');
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('users')
    .then(function() {
      return knex.raw('DROP TYPE user_role');
    });
}; 