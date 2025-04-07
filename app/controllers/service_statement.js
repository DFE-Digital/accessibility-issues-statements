const axios = require('axios');
const { getService } = require('../data/services');
const { getServiceStatementSettings } = require('../data/service_statement_settings');
const { db } = require('../db');

async function show(req, res) {
  try {
    const service = await getService(req.params.serviceId);
    const settings = await getServiceStatementSettings(service.id);
    
    if (!service) {
      return res.status(404).render('error', { message: 'Service not found' });
    }

    // Check if user can enroll the service
    const ableToEnroll = settings && 
      settings.response_time_sla && 
      settings.complaint_contact && 
      settings.last_audit_date && 
      settings.last_audit_by && 
      settings.last_audit_method;

    // Generate the statement URL
    const statementUrl = `${req.protocol}://${req.get('host')}/s/${service.numeric_id}`;

    res.render('services/department_admin/statement/index', {
      service,
      settings,
      ableToEnroll,
      statementUrl,
      baseUrl: req.protocol + '://' + req.get('host')
    });
  } catch (error) {
    console.error('Error showing service statement:', error);
    res.status(500).render('error', { message: 'Error loading service statement' });
  }
}

async function validateServiceUrl(req, res) {
  try {
    const service = await getService(req.params.serviceId);
    
    if (!service || !service.url) {
      return res.status(400).json({ success: false, message: 'Service URL not found' });
    }

    // Get the service's URL content
    const response = await axios.get(service.url);
    const html = response.data;

    // Get the statement URL
    const statementUrl = `${req.protocol}://${req.get('host')}/s/${service.numeric_id}`;

    // Check if the statement URL exists in the page
    const hasStatementLink = html.includes(statementUrl);

    if (hasStatementLink) {
      // Update service enrolled status directly in the database
      await db('services')
        .where('id', service.id)
        .update({
          statement_enrolled: true,
          updated_at: db.fn.now()
        });

      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (error) {
    console.error('Error validating service URL:', error);
    return res.status(500).json({ success: false, message: 'Error validating service URL' });
  }
}

module.exports = {
  show,
  validateServiceUrl
}; 