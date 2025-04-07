/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if columns already exist
  const hasServicesNumericId = await knex.schema.hasColumn('services', 'numeric_id');
  const hasIssuesNumericId = await knex.schema.hasColumn('issues', 'numeric_id');

  if (!hasServicesNumericId) {
    await knex.raw(`
      ALTER TABLE services ADD numeric_id INT NOT NULL
      CONSTRAINT DF_services_numeric_id DEFAULT NEXT VALUE FOR services_numeric_id_seq
    `);
  }

  if (!hasIssuesNumericId) {
    await knex.raw(`
      ALTER TABLE issues ADD numeric_id INT NOT NULL
      CONSTRAINT DF_issues_numeric_id DEFAULT NEXT VALUE FOR issues_numeric_id_seq
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Check if columns exist before trying to drop them
  const hasServicesNumericId = await knex.schema.hasColumn('services', 'numeric_id');
  const hasIssuesNumericId = await knex.schema.hasColumn('issues', 'numeric_id');

  if (hasServicesNumericId) {
    await knex.raw('ALTER TABLE services DROP CONSTRAINT IF EXISTS DF_services_numeric_id');
    await knex.schema.alterTable('services', function(table) {
      table.dropColumn('numeric_id');
    });
  }

  if (hasIssuesNumericId) {
    await knex.raw('ALTER TABLE issues DROP CONSTRAINT IF EXISTS DF_issues_numeric_id');
    await knex.schema.alterTable('issues', function(table) {
      table.dropColumn('numeric_id');
    });
  }
}; 