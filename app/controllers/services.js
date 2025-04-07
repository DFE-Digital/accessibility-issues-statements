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

    const serviceData = {
      name: req.body.name,
      url: req.body.url,
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

    res.render('services/department_admin/edit', {
      service
    });
  } catch (error) {
    console.error('Error showing edit service form:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the edit service form.'
      }
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

    const serviceData = {
      name: req.body.name,
      url: req.body.url,
      updated_at: new Date()
    };

    await servicesData.updateService(id, serviceData);
    
    // Log the update
    await servicesData.logServiceAction(id, user.id, 'update', serviceData);

    res.redirect(`/services/${id}`);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem updating the service.'
      }
    });
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
  updateService
}; 