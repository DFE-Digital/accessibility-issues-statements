const { db } = require('../db');

/**
 * Get statement settings for a service
 */
async function getServiceStatementSettings(serviceId) {
  const settings = await db('service_statement_settings')
    .where({ service_id: serviceId })
    .first();

  const contactMethods = await db('service_contact_methods')
    .where({ service_id: serviceId })
    .orderBy('display_order', 'asc');

  return {
    ...settings,
    contactMethods
  };
}

/**   
 * Get service contact settings for a service
 */
async function getServiceContactSettings(serviceId) {
  const settings = await db('service_contact_methods')
    .where({ service_id: serviceId })

  return settings;
}


/**
 * Create or update service statement settings
 */
async function upsertServiceStatementSettings(serviceId, data, userId) {
  const { contactMethods, ...settings } = data;

  // Start a transaction
  await db.transaction(async (trx) => {
    // Upsert settings
    const existingSettings = await trx('service_statement_settings')
      .where({ service_id: serviceId })
      .first();

    if (existingSettings) {
      await trx('service_statement_settings')
        .where({ service_id: serviceId })
        .update({
          ...settings,
          updated_at: db.fn.now(),
          updated_by: userId
        });
    } else {
      // For new records, ensure we have a default complaint_contact
      const defaultSettings = {
        ...settings,
        service_id: serviceId,
        complaint_contact: settings.complaint_contact || 'Not provided',
        created_by: userId,
        updated_by: userId
      };

      await trx('service_statement_settings')
        .insert(defaultSettings);
    }

    // Delete existing contact methods
    await trx('service_contact_methods')
      .where({ service_id: serviceId })
      .delete();

    // Insert new contact methods
    if (contactMethods && contactMethods.length > 0) {
      await trx('service_contact_methods')
        .insert(contactMethods.map((method, index) => ({
          service_id: serviceId,
          contact_type: method.contact_type,
          contact_value: method.contact_value,
          display_order: index,
          created_by: userId,
          updated_by: userId
        })));
    }
  });
}

module.exports = {
  getServiceStatementSettings,
  getServiceContactSettings,
  upsertServiceStatementSettings
}; 