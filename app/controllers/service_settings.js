const { getServiceStatementSettings, upsertServiceStatementSettings } = require('../data/service_statement_settings');
const { getService } = require('../data/services');

/**
 * Show service settings page
 */
async function showServiceSettings(req, res) {
  try {
    const serviceId = req.params.serviceId;
    const service = await getService(serviceId);

    if (!service) {
      return res.status(404).render('404');
    }

    const settings = await getServiceStatementSettings(serviceId);

    res.render('services/department_admin/settings/index', {
      service,
      settings: settings || {
        response_time_sla: 10,
        contactMethods: []
      }
    });
  } catch (error) {
    console.error('Error showing service settings:', error);
    res.status(500).render('error', {
      error: 'Something went wrong',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update service settings
 */
async function updateServiceSettings(req, res) {
  try {
    const serviceId = req.params.serviceId;
    const service = await getService(serviceId);

    if (!service) {
      return res.status(404).render('404');
    }

    const {
      response_time_sla,
      complaint_contact,
      'last_audit_date-day': day,
      'last_audit_date-month': month,
      'last_audit_date-year': year,
      last_audit_by,
      last_audit_method,
      contact_types,
      contact_values
    } = req.body;

    // Validate required fields
    const errors = {};
    if (!response_time_sla) errors.response_time_sla = { text: 'Enter a response time SLA' };
    if (!complaint_contact) errors.complaint_contact = { text: 'Enter a complaint contact' };

    // Build contact methods array from parallel arrays
    const contactMethods = [];
    if (contact_types && contact_values) {
      const types = Array.isArray(contact_types) ? contact_types : [contact_types];
      const values = Array.isArray(contact_values) ? contact_values : [contact_values];
      
      types.forEach((type, index) => {
        if (type && values[index]) {
          contactMethods.push({
            type,
            value: values[index]
          });
        }
      });
    }

    // Combine date fields if all are present
    let last_audit_date = null;
    if (day && month && year) {
      // Create a date string in YYYY-MM-DD format
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      // Validate the date
      const date = new Date(dateStr);
      if (date instanceof Date && !isNaN(date)) {
        last_audit_date = dateStr;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.render('services/department_admin/settings/index', {
        service,
        settings: {
          response_time_sla,
          complaint_contact,
          last_audit_date,
          last_audit_by,
          last_audit_method,
          contactMethods
        },
        errors
      });
    }

    // Update settings
    await upsertServiceStatementSettings(serviceId, {
      response_time_sla: parseInt(response_time_sla),
      complaint_contact,
      last_audit_date,
      last_audit_by,
      last_audit_method,
      contactMethods
    }, req.session.user.id);


    res.redirect(`/services/${serviceId}/settings`);
  } catch (error) {
    console.error('Error updating service settings:', error);
    res.status(500).render('error', {
      error: 'Something went wrong',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Show main settings page
exports.showServiceSettings = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  res.render('services/department_admin/settings/index', { service, settings });
};

// Response time SLA
exports.showResponseTime = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  res.render('services/department_admin/settings/response-time', { service, settings });
};

exports.updateResponseTime = async (req, res) => {
  const serviceId = req.params.serviceId;
  const { response_time_sla } = req.body;
  
  // Validation
  const errors = {};
  if (!response_time_sla || response_time_sla < 1 || response_time_sla > 60) {
    errors.response_time_sla = {
      text: "Enter a response time between 1 and 60 working days"
    };
  }

  if (Object.keys(errors).length > 0) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    return res.render('services/department_admin/settings/response-time', { 
      service, 
      settings, 
      errors 
    });
  }

  const settings = await getServiceStatementSettings(serviceId);
  
  // Create a new settings object with only the fields we want to update
  const updatedSettings = {
    response_time_sla: parseInt(response_time_sla)
  };

  // If we have existing settings, include them
  if (settings) {
    updatedSettings.complaint_contact = settings.complaint_contact;
    updatedSettings.last_audit_date = settings.last_audit_date;
    updatedSettings.last_audit_by = settings.last_audit_by;
    updatedSettings.last_audit_method = settings.last_audit_method;
    updatedSettings.contactMethods = settings.contactMethods || [];
  }

  await upsertServiceStatementSettings(serviceId, updatedSettings, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
};

// Complaint contact
exports.showComplaintContact = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  res.render('services/department_admin/settings/complaint-contact', { service, settings });
};

exports.updateComplaintContact = async (req, res) => {
  const serviceId = req.params.serviceId;
  const { complaint_contact } = req.body;
  
  // Validation
  const errors = {};
  if (!complaint_contact) {
    errors.complaint_contact = {
      text: "Enter a complaint contact email or URL"
    };
  }

  if (Object.keys(errors).length > 0) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    return res.render('services/department_admin/settings/complaint-contact', { 
      service, 
      settings, 
      errors 
    });
  }

  const settings = await getServiceStatementSettings(serviceId);
  await upsertServiceStatementSettings(serviceId, {
    ...settings,
    complaint_contact
  }, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
};

// Audit details
exports.showAudit = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  res.render('services/department_admin/settings/audit', { service, settings });
};

exports.updateAudit = async (req, res) => {
  const serviceId = req.params.serviceId;
  const { 
    'last_audit_date-day': day,
    'last_audit_date-month': month,
    'last_audit_date-year': year,
    last_audit_by,
    last_audit_method
  } = req.body;

  // Validation
  const errors = {};
  
  if (!day || !month || !year) {
    errors.last_audit_date = {
      text: "Enter a valid audit date"
    };
  }

  if (!last_audit_by) {
    errors.last_audit_by = {
      text: "Enter who performed the audit"
    };
  }

  if (!last_audit_method) {
    errors.last_audit_method = {
      text: "Enter the audit method used"
    };
  }

  if (Object.keys(errors).length > 0) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    return res.render('services/department_admin/settings/audit', { 
      service, 
      settings, 
      errors 
    });
  }

  // Create date in UTC to avoid timezone issues
  const last_audit_date = new Date(Date.UTC(year, month - 1, day));
  
  const settings = await getServiceStatementSettings(serviceId);
  await upsertServiceStatementSettings(serviceId, {
    ...settings,
    last_audit_date,
    last_audit_by,
    last_audit_method
  }, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
};

// Contact methods
exports.showAddContactMethod = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  res.render('services/department_admin/settings/contact-methods', { 
    service,
    settings,
    method: {},
    action: 'add'
  });
};

exports.createContactMethod = async (req, res) => {
  const serviceId = req.params.serviceId;
  const { contact_type, contact_value } = req.body;

  // Validation
  const errors = {};
  if (!contact_type) {
    errors.contact_type = {
      text: "Select a contact method type"
    };
  }
  if (!contact_value) {
    errors.contact_value = {
      text: "Enter the contact details"
    };
  }

  if (Object.keys(errors).length > 0) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    return res.render('services/department_admin/settings/contact-methods', { 
      service,
      settings,
      method: { contact_type, contact_value },
      errors,
      action: 'add'
    });
  }

  const settings = await getServiceStatementSettings(serviceId);
  const contactMethods = settings.contactMethods || [];
  
  // Check if contact type already exists
  if (contactMethods.some(m => m.contact_type === contact_type)) {
    errors.contact_type = {
      text: "This contact type already exists"
    };
    const service = await getService(serviceId);
    return res.render('services/department_admin/settings/contact-methods', { 
      service,
      settings,
      method: { contact_type, contact_value },
      errors,
      action: 'add'
    });
  }

  await upsertServiceStatementSettings(serviceId, {
    ...settings,
    contactMethods: [
      ...contactMethods,
      {
        contact_type,
        contact_value,
        display_order: contactMethods.length
      }
    ]
  }, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
};

exports.showEditContactMethod = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  const methodId = req.params.methodId;
  const method = settings.contactMethods.find(m => m.id === methodId);
  
  if (!method) {
    return res.redirect(`/services/${req.params.serviceId}/settings`);
  }

  res.render('services/department_admin/settings/contact-methods', { 
    service, 
    settings,
    method,
    action: 'edit'
  });
};

exports.updateContactMethod = async (req, res) => {
  const serviceId = req.params.serviceId;
  const methodId = req.params.methodId;
  const { contact_type, contact_value } = req.body;

  // Validation
  const errors = {};
  if (!contact_type) {
    errors.contact_type = {
      text: "Select a contact method type"
    };
  }
  if (!contact_value) {
    errors.contact_value = {
      text: "Enter the contact details"
    };
  }

  if (Object.keys(errors).length > 0) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    return res.render('services/department_admin/settings/contact-methods', { 
      service,
      settings,
      method: { id: methodId, contact_type, contact_value },
      errors,
      action: 'edit'
    });
  }

  const settings = await getServiceStatementSettings(serviceId);
  
  // Check if contact type already exists for a different method
  if (settings.contactMethods.some(m => m.contact_type === contact_type && m.id !== methodId)) {
    errors.contact_type = {
      text: "This contact type already exists"
    };
    const service = await getService(serviceId);
    return res.render('services/department_admin/settings/contact-methods', { 
      service,
      settings,
      method: { id: methodId, contact_type, contact_value },
      errors,
      action: 'edit'
    });
  }

  const contactMethods = settings.contactMethods.map(m => 
    m.id === methodId ? { ...m, contact_type, contact_value } : m
  );

  await upsertServiceStatementSettings(serviceId, {
    ...settings,
    contactMethods
  }, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
};

exports.showDeleteContactMethod = async (req, res) => {
  const service = await getService(req.params.serviceId);
  const settings = await getServiceStatementSettings(req.params.serviceId);
  const method = settings.contactMethods.find(m => m.id === req.params.methodId);
  
  if (!method) {
    return res.redirect(`/services/${req.params.serviceId}/settings`);
  }

  res.render('services/department_admin/settings/delete-contact-method', { 
    service, 
    method,
    settings
  });
};

exports.deleteContactMethod = async (req, res) => {
  const serviceId = req.params.serviceId;
  const methodId = req.params.methodId;

  const settings = await getServiceStatementSettings(serviceId);
  const contactMethods = settings.contactMethods.filter(m => m.id !== methodId);

  await upsertServiceStatementSettings(serviceId, {
    ...settings,
    contactMethods
  }, req.session.user.id);

  res.redirect(`/services/${serviceId}/settings`);
}; 