const NotifyClient = require('notifications-node-client').NotifyClient;

const notifyClient = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY);

/**
 * Send an email using GOV Notify
 * @param {string} email - Recipient email address
 * @param {string} templateId - GOV Notify template ID
 * @param {Object} personalisation - Template variables
 * @returns {Promise<void>}
 */
async function sendEmail(email, templateId, personalisation) {
  try {
    await notifyClient.sendEmail(templateId, email, {
      personalisation,
      reference: null
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail
}; 