const { db } = require('../db');
const servicesData = require('../data/services');
const { getDepartmentServices } = require('../data/services');
const { getServiceIssues } = require('../data/issues');

/**
 * Get services for the current user's department
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const departmentId = user.department.id; // Access department ID from the nested department object

    // Get services and stats based on user role
    let services, stats;
    
    if (user.role === 'super_admin') {
      // Super admin can see all services
      [services, stats] = await Promise.all([
        servicesData.getAllServices(),
        servicesData.getServicesStats()
      ]);
    } else if (user.role === 'department_admin') {
      // Department admin can see services in their department
      [services, stats] = await Promise.all([
        servicesData.getDepartmentServices(departmentId),
        servicesData.getDepartmentServicesStats(departmentId)
      ]);
    } else {
      // Regular users can see services they have access to
      [services, stats] = await Promise.all([
        servicesData.getUserServices(user.id),
        servicesData.getUserServicesStats(user.id)
      ]);
    }

    // Render the appropriate view based on user role
    const viewPath = `services/${user.role}/index`;
    
    res.render(viewPath, {
      services,
      stats,
      user
    });
  } catch (error) {
    console.error('Services error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the services',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show form to create a new service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const newService = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    
    // Only department admins and super admins can create services
    if (user.role !== 'department_admin' && user.role !== 'super_admin') {
      return res.status(403).render('error', {
        error: 'You do not have permission to create services'
      });
    }

    res.render(`services/${user.role}/new`, {
      user
    });
  } catch (error) {
    console.error('New service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the new service form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createService = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    
    // Only department admins and super admins can create services
    if (user.role !== 'department_admin' && user.role !== 'super_admin') {
      return res.status(403).render('error', {
        error: 'You do not have permission to create services'
      });
    }

    // Get the department ID - for super admins it comes from the form, for department admins it's their department
    const departmentId = user.role === 'super_admin' ? req.body.department_id : user.department.id;

    if (!departmentId) {
      return res.status(400).render('error', {
        error: 'Department ID is required'
      });
    }

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = {
      name: req.body.name,
      url: req.body.url
    };

    // Name validation
    if (!values.name || values.name.trim() === '') {
      const message = 'Enter a service name';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    } else if (values.name.length > 255) {
      const message = 'Service name must be 255 characters or less';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    }

    // URL validation
    if (!values.url || values.url.trim() === '') {
      const message = 'Enter a service URL';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    } else if (!values.url.match(/^https?:\/\/.+/)) {
      const message = 'Enter a valid URL starting with http:// or https://';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    } else if (values.url.length > 1000) {
      const message = 'URL must be 1000 characters or less';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    }

    // If there are validation errors, render the form again with errors
    if (errorSummary.length > 0) {
      return res.render(`services/${user.role}/new`, {
        user,
        errors: errorSummary,
        fieldErrors,
        values
      });
    }

    const serviceData = {
      name: values.name.trim(),
      url: values.url.trim(),
      department_id: departmentId,
      service_owner_id: user.id,
      created_at: new Date(),
      updated_at: new Date(),
      statement_enrolled: false
    };

    const service = await servicesData.createService(serviceData);
    
    // Log the creation
    await servicesData.logServiceAction(service.id, user.id, 'create', serviceData);

    res.redirect(`/services/${service.id}`);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem creating the service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show service overview and user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showService = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    // Get the service and verify department access
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === id);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    // Get issues for analysis
    const issues = await getServiceIssues(id);

    // Calculate issue statistics
    const openIssues = issues.filter(issue => ['open', 'in_progress'].includes(issue.status));
    const pastDueIssues = openIssues.filter(issue => {
      if (!issue.planned_fix) return false;
      return new Date(issue.planned_fix) < new Date();
    });
    const upcomingIssues = openIssues.filter(issue => {
      if (!issue.planned_fix) return false;
      const plannedDate = new Date(issue.planned_fix);
      const today = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);
      return plannedDate >= today && plannedDate <= twoWeeksFromNow;
    });

    // Get service users - temporarily using a placeholder until user_services table is set up
    const serviceUsers = [];

    res.render('services/department_admin/show', {
      service,
      serviceUsers,
      stats: {
        openIssues: openIssues.length,
        pastDueIssues: pastDueIssues.length,
        upcomingIssues: upcomingIssues.length,
        totalIssues: issues.length
      },
      pastDueIssues,
      upcomingIssues,
      issues: openIssues  // Only pass open issues to the template
    });
  } catch (error) {
    console.error('Error showing service:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the service details.'
      }
    });
  }
};

/**
 * Show service issues list and management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showServiceIssues = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const user = req.session.user;
    const { sort, order } = req.query;

    // Get the service and verify department access
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

    // Get issues for the service
    const issues = await getServiceIssues(serviceId);

    // Calculate counts and filter issues
    const openIssues = issues.filter(issue => ['open', 'in_progress'].includes(issue.status));
    const closedIssues = issues.filter(issue => issue.status === 'closed');
    const levelAIssues = openIssues.filter(issue => issue.wcag_level === 'A');
    const levelAAIssues = openIssues.filter(issue => issue.wcag_level === 'AA');

    // Sort issues based on query parameters
    if (sort && order) {
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortKey = sort === 'created_at' ? 'created_at' : sort;
      
      openIssues.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1 * sortOrder;
        if (a[sortKey] > b[sortKey]) return 1 * sortOrder;
        return 0;
      });

      closedIssues.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1 * sortOrder;
        if (a[sortKey] > b[sortKey]) return 1 * sortOrder;
        return 0;
      });
    }

    res.render('services/department_admin/issues/issues', {
      service,
      open_issues: openIssues,
      closed_issues: closedIssues,
      openCount: openIssues.length,
      levelACount: levelAIssues.length,
      levelAACount: levelAAIssues.length,
      closedCount: closedIssues.length,
      sortBy: sort,
      sortOrder: order
    });
  } catch (error) {
    console.error('Error showing service issues:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the service issues.'
      }
    });
  }
};

/**
 * Show edit service form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const editService = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const serviceId = req.params.id;

    // Get the service
    const service = await servicesData.getService(serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: 'Service not found'
      });
    }

    // Check if user has permission to edit this service
    if (user.role !== 'super_admin' && service.department_id !== user.department.id) {
      return res.status(403).render('error', {
        error: 'You do not have permission to edit this service'
      });
    }

    res.render(`services/${user.role}/edit`, {
      user,
      service
    });
  } catch (error) {
    console.error('Edit service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the edit service form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateService = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const serviceId = req.params.id;

    // Get the existing service
    const existingService = await servicesData.getService(serviceId);

    if (!existingService) {
      return res.status(404).render('error', {
        error: 'Service not found'
      });
    }

    // Check if user has permission to edit this service
    if (user.role !== 'super_admin' && existingService.department_id !== user.department.id) {
      return res.status(403).render('error', {
        error: 'You do not have permission to edit this service'
      });
    }

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = {
      name: req.body.name,
      url: req.body.url
    };

    // Name validation
    if (!values.name || values.name.trim() === '') {
      const message = 'Enter a service name';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    } else if (values.name.length > 255) {
      const message = 'Service name must be 255 characters or less';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    } else if (values.name !== existingService.name) {
      // Check if name is already taken
      const existingServiceWithName = await servicesData.getServiceByName(values.name);
      if (existingServiceWithName && existingServiceWithName.id !== serviceId) {
        const message = 'A service with this name already exists';
        errorSummary.push({ field: 'name', message });
        fieldErrors.name = message;
      }
    }

    // URL validation
    if (!values.url || values.url.trim() === '') {
      const message = 'Enter a service URL';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    } else if (!values.url.match(/^https?:\/\/.+/)) {
      const message = 'Enter a valid URL starting with http:// or https://';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    } else if (values.url.length > 1000) {
      const message = 'URL must be 1000 characters or less';
      errorSummary.push({ field: 'url', message });
      fieldErrors.url = message;
    } else if (values.url !== existingService.url) {
      // Check if URL is already taken
      const existingServiceWithUrl = await servicesData.getServiceByUrl(values.url);
      if (existingServiceWithUrl && existingServiceWithUrl.id !== serviceId) {
        const message = 'A service with this URL already exists';
        errorSummary.push({ field: 'url', message });
        fieldErrors.url = message;
      }
    }

    // If there are validation errors, render the form again with errors
    if (errorSummary.length > 0) {
      return res.render(`services/${user.role}/edit`, {
        user,
        service: existingService,
        errors: errorSummary,
        fieldErrors,
        values
      });
    }

    const serviceData = {
      name: values.name.trim(),
      url: values.url.trim(),
      updated_at: new Date()
    };

    await servicesData.updateService(serviceId, serviceData);
    
    // Log the update
    await servicesData.logServiceAction(serviceId, user.id, 'update', serviceData);

    res.redirect(`/services/${serviceId}`);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem updating the service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const assignIssue = async (req, res) => {
  try {
    const { serviceId, issueId } = req.params;
    const { assign_to, new_user_email, comment } = req.body;
    const userId = req.session.user.id;

    // Validate input
    if (!assign_to && !new_user_email) {
      req.flash('error', 'Please select a user or enter an email address');
      return res.redirect(`/services/${serviceId}/issues/${issueId}`);
    }

    // Check if user has permission to assign issues
    const service = await db('services')
      .where('id', serviceId)
      .first();

    if (!service) {
      req.flash('error', 'Service not found');
      return res.redirect('/services');
    }

    // If assigning to a new user, create the user first
    let assignedToId = assign_to;
    if (new_user_email) {
      // Check if user already exists
      let user = await db('users')
        .where('email', new_user_email)
        .first();

      if (!user) {
        // Create new user
        const [newUserId] = await db('users')
          .insert({
            email: new_user_email,
            department_id: service.department_id,
            role: 'user',
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('id');

        assignedToId = newUserId;
      } else {
        assignedToId = user.id;
      }
    }

    // Update the issue
    await db('issues')
      .where('id', issueId)
      .update({
        assigned_to: assignedToId,
        updated_at: new Date()
      });

    // Add assignment comment
    if (comment) {
      await db('issue_comments')
        .insert({
          issue_id: issueId,
          user_id: userId,
          comment: comment,
          created_at: new Date()
        });
    }

    req.flash('success', 'Issue assigned successfully');
    res.redirect(`/services/${serviceId}/issues/${issueId}`);
  } catch (error) {
    console.error('Error assigning issue:', error);
    req.flash('error', 'Failed to assign issue');
    res.redirect(`/services/${req.params.serviceId}/issues/${req.params.issueId}`);
  }
};

// Export controller functions
module.exports = {
  index,
  newService,
  createService,
  showService,
  showServiceIssues,
  editService,
  updateService,
  assignIssue
}; 