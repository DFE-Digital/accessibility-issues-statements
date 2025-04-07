const { getDepartmentServices, getService, getServiceByNumericId } = require('../data/services');
const { getOpenIssues } = require('../data/issues');
const { getActiveTemplate } = require('../data/statement_templates');
const { getServiceStatementSettings, getServiceContactSettings } = require('../data/service_statement_settings');
const marked = require('marked');

/**
 * Show statement index page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showStatementIndex(req, res) {
  try {
    const { serviceId } = req.params;
    const user = req.session.user;

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    // Get open issues count for compliance status
    const openIssues = await getOpenIssues(serviceId);
    service.open_issues = openIssues.length;

    // Get base URL from environment or use a default
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    // Get statement settings to determine if the statement is able to be enrolled. All statement settings are required to be set.
    // and the service contact settings need at least 1 contact method.

    const statementSettings = await getServiceStatementSettings(serviceId);
    const serviceContactSettings = await getServiceContactSettings(serviceId);



    let ableToEnroll = false;

    if (statementSettings.complaint_contact && statementSettings.response_time_sla && statementSettings.last_audit_date && statementSettings.last_audit_by && statementSettings.last_audit_method && serviceContactSettings.length > 0) {
      ableToEnroll = true;
    }



    res.render('services/department_admin/statement/index', {
      service,
      baseUrl,
      statementUrl: `${baseUrl}/s/${service.numeric_id}`,
      ableToEnroll
    });
  } catch (error) {
    console.error('Error showing statement index:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the accessibility statement.'
      }
    });
  }
}

function formatDate(dateString) {
  if (!dateString) return '[Not provided]';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatContactMethods(contactMethods) {
  if (!contactMethods || contactMethods.length === 0) {
    return '[Contact methods not provided]';
  }

  // Format each contact method as a list item
  const formattedMethods = contactMethods.map(method => {
    const type = method.type || method.contact_type; // Handle both property names
    const value = method.value || method.contact_value;
    
    switch (type) {
      case 'email':
        return `* email: ${value}`;
      case 'phone':
        return `* phone: ${value}`;
      case 'online_form':
        return `* [fill in our online form](${value})`;
      default:
        return `* ${value}`;
    }
  });

  // Return the list items joined with newlines
  return formattedMethods.join('\n');
}

async function replaceTemplateParameters(template, service) {
  let content = template.content;
  
  // Get statement settings for the service
  const settings = await getServiceStatementSettings(service.id);
  
  // Get today's date in the correct format
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // Replace all template variables with service data
  const replacements = {
    '{{ name_of_service }}': service.name,
    '{{ department_name }}': service.department_name,
    '{{ contact_email }}': service.contact_email,
    '{{ statement_version }}': template.version,
    '{{ service_url }}': service.url,
    '{{ response_time_sla }}': settings?.response_time_sla || '[Response time not set]',
    '{{ complaint_contact }}': settings?.complaint_contact || '[Complaint contact not provided]',
    '{{ last_audit_date }}': formatDate(settings?.last_audit_date),
    '{{ last_audit_by }}': settings?.last_audit_by || '[Auditor not specified]',
    '{{ last_audit_method }}': settings?.last_audit_method || '[Audit method not specified]',
    '{{ contact_methods }}': formatContactMethods(settings?.contactMethods),
    '{{ today }}': today
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(placeholder, 'g'), value || '[Not provided]');
  }

  return content;
}

/**
 * Show public statement page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showPublicStatement(req, res) {
  try {
    const numericId = req.params.numericId;
    const service = await getServiceByNumericId(numericId);

    if (!service) {
      return res.status(404).render('404');
    }

    const openIssues = await getOpenIssues(service.id);
    const template = await getActiveTemplate();

    if (!template) {
      return res.status(404).render('404');
    }

    // Replace template parameters and convert to HTML
    const statementHtml = await replaceTemplateParameters(template, service);

    res.render('public/statement', {
      service,
      openIssues,
      statementHtml
    });
  } catch (error) {
    console.error('Error showing public statement:', error);
    res.status(500).render('500');
  }
}

module.exports = {
  showStatementIndex,
  showPublicStatement
}; 