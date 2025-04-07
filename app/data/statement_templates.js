const { db } = require('../db');

/**
 * Get the next version number for today
 * Format: YYYYMMDD_N where N is incremented if date exists
 */
async function getNextVersionNumber() {
  const today = new Date();
  const datePrefix = today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  // Get all versions for today
  const versions = await db('statement_templates')
    .where('version', 'like', `${datePrefix}_%`)
    .orderBy('version', 'desc');

  if (versions.length === 0) {
    return `${datePrefix}_1`;
  }

  // Extract the highest N value
  const latestVersion = versions[0].version;
  const currentN = parseInt(latestVersion.split('_')[1]);
  return `${datePrefix}_${currentN + 1}`;
}

/**
 * Get all statement templates ordered by version desc
 */
async function getTemplates() {
  return db('statement_templates')
    .select('*')
    .orderBy('version', 'desc');
}

/**
 * Get a specific template by ID
 */
async function getTemplate(id) {
  return db('statement_templates')
    .where({ id })
    .first();
}

/**
 * Get the currently active template
 */
async function getActiveTemplate() {
  return db('statement_templates')
    .where({ is_active: true })
    .orderBy('version', 'desc')
    .first();
}

/**
 * Create a new template
 */
async function createTemplate(templateData) {
  // If this template is being set as active, deactivate all others
  if (templateData.is_active) {
    await db('statement_templates')
      .update({ is_active: false });
  }

  const [id] = await db('statement_templates')
    .insert(templateData)
    .returning('id');

  return id;
}

/**
 * Update an existing template
 */
async function updateTemplate(id, templateData) {
  // If this template is being set as active, deactivate all others
  if (templateData.is_active) {
    await db('statement_templates')
      .whereNot({ id })
      .update({ is_active: false });
  }

  await db('statement_templates')
    .where({ id })
    .update({
      ...templateData,
      updated_at: db.fn.now()
    });
}

module.exports = {
  getTemplates,
  getTemplate,
  getActiveTemplate,
  createTemplate,
  updateTemplate,
  getNextVersionNumber
}; 