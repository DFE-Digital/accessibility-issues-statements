/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create sequences if they don't exist
  await knex.raw(`
    IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'services_numeric_id_seq')
    CREATE SEQUENCE services_numeric_id_seq START WITH 1 INCREMENT BY 1;
  `);
  
  await knex.raw(`
    IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'issues_numeric_id_seq')
    CREATE SEQUENCE issues_numeric_id_seq START WITH 1 INCREMENT BY 1;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw('DROP SEQUENCE IF EXISTS services_numeric_id_seq');
  await knex.raw('DROP SEQUENCE IF EXISTS issues_numeric_id_seq');
}; 