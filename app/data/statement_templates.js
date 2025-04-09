const { db } = require('../db');

/**
 * Get the next version number for a template
 */
async function getNextVersionNumber(templateName) {
  const today = new Date();
  const datePrefix = today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  // Get the latest version for this template name on today's date
  const latestVersion = await db('statement_templates')
    .where({ name: templateName })
    .where('version', 'like', `${datePrefix}_%`)
    .orderBy('version', 'desc')
    .first()
    .select('version');

  if (!latestVersion) {
    return `${datePrefix}_1`;
  }

  // Extract the current version number and increment it
  const currentVersion = parseInt(latestVersion.version.split('_')[1]);
  return `${datePrefix}_${currentVersion + 1}`;
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
 * Get the active template for a specific name
 */
async function getActiveTemplateByName(name) {
  return db('statement_templates')
    .where({ 
      name,
      is_active: true 
    })
    .orderBy('version', 'desc')
    .first();
}

/**
 * Deactivate other templates of the same type
 */
async function deactivateOtherTemplatesOfType(templateType) {
  return db('statement_templates')
    .where({ 
      name: templateType,
      is_active: true 
    })
    .update({ is_active: false });
}

/**
 * Create a new template
 */
async function createTemplate(templateData) {
  console.log('Data layer - Creating template with data:', templateData);

  // If this template is being set as active, deactivate other templates of the same type
  if (templateData.is_active) {
    await deactivateOtherTemplatesOfType(templateData.name);
  }

  try {
    const [id] = await db('statement_templates')
      .insert({
        name: templateData.name,
        content: templateData.content,
        version: templateData.version,
        is_active: templateData.is_active,
        created_by: templateData.created_by,
        updated_by: templateData.updated_by
      })
      .returning('id');
    
    console.log('Data layer - Created template with ID:', id);
    return id;
  } catch (error) {
    console.error('Data layer - Error creating template:', error);
    throw error;
  }
}

/**
 * Update an existing template
 */
async function updateTemplate(id, templateData) {
  // If this template is being set as active, deactivate other templates of the same type
  if (templateData.is_active) {
    await deactivateOtherTemplatesOfType(templateData.name);
  }

  await db('statement_templates')
    .where({ id })
    .update({
      name: templateData.name,
      content: templateData.content,
      version: templateData.version,
      is_active: templateData.is_active,
      updated_by: templateData.updated_by,
      updated_at: db.fn.now()
    });
}

module.exports = {
  getTemplates,
  getTemplate,
  getActiveTemplateByName,
  createTemplate,
  updateTemplate,
  getNextVersionNumber,
  deactivateOtherTemplatesOfType
}; 