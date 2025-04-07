exports.up = function(knex) {
  return knex.schema
    .createTable('wcag_criteria', function(table) {
      table.increments('id').primary();
      table.string('criterion').notNullable().unique();
      table.string('title').notNullable();
      table.enum('level', ['A', 'AA', 'AAA', 'Best practice']).notNullable();
      table.enum('version', ['2.1', '2.2', '3.0']).notNullable();
      table.text('description');
      table.string('guidance_url');
      table.timestamps(true, true);
    })
    .then(() => {
      return knex.schema.alterTable('issues', function(table) {
        table.string('wcag_criterion');
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('issues', function(table) {
      table.dropColumn('wcag_criterion');
    })
    .then(() => {
      return knex.schema.dropTable('wcag_criteria');
    });
}; 