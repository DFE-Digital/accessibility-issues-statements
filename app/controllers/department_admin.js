const { db } = require('../db');

const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    // Get department stats
    const department = await db('departments')
      .select('departments.*')
      .where('departments.id', req.session.user.department.id)
      .first();

    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }

    // Get service count
    const servicesCount = await db('services')
      .where('department_id', req.session.user.department.id)
      .count('* as count')
      .first();

    // Get user count
    const usersCount = await db('users')
      .where('department_id', req.session.user.department.id)
      .count('* as count')
      .first();

    res.render('department_admin/index', {
      department,
      servicesCount: servicesCount.count,
      usersCount: usersCount.count,
      user: req.session.user
    });
  } catch (error) {
    console.error('Department admin dashboard error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showServices = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const services = await db('services')
      .select(
        'services.*',
        db.raw('COUNT(DISTINCT user_services.user_id) as enrolled_users')
      )
      .leftJoin('user_services', 'services.id', 'user_services.service_id')
      .where('services.department_id', req.session.user.department.id)
      .groupBy('services.id')
      .orderBy('services.name');

    res.render('department_admin/services', {
      services,
      user: req.session.user
    });
  } catch (error) {
    console.error('Department admin services error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the services',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showService = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { serviceId } = req.params;

    const service = await db('services')
      .select('services.*')
      .where({
        'services.id': serviceId,
        'services.department_id': req.session.user.department.id
      })
      .first();

    if (!service) {
      return res.status(404).render('error', {
        error: 'Service not found'
      });
    }

    // Get enrolled users
    const enrolledUsers = await db('user_services')
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'user_services.created_at as enrolled_at'
      )
      .join('users', 'user_services.user_id', 'users.id')
      .where('user_services.service_id', serviceId)
      .orderBy('users.first_name');

    res.render('department_admin/service', {
      service,
      enrolledUsers,
      user: req.session.user
    });
  } catch (error) {
    console.error('Department admin service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showSettings = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const departmentId = req.session.user.department.id;

    // Get user's department and its domains
    const department = await db('departments')
      .select('*')
      .where('id', departmentId)
      .first();

    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }

    // Get allowed domains
    const domains = await db('department_allowed_domains')
      .select('domain')
      .where('department_id', departmentId)
      .orderBy('domain');

    // Get business areas
    const businessAreas = await db('business_areas')
      .select('*')
      .where('department_id', departmentId)
      .orderBy('name');

    res.render('department_admin/settings/index', {
      department: {
        ...department,
        domains: domains.map(d => d.domain)
      },
      businessAreas,
      user: req.session.user,
      successMessage: req.session.successMessage,
      errorMessage: req.session.errorMessage,
      errors: req.session.errors || {},
      csrfToken: req.csrfToken()
    });

    // Clear messages after displaying them
    delete req.session.successMessage;
    delete req.session.errorMessage;
    delete req.session.errors;
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the settings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const { name, domains } = req.body;
    const departmentId = req.session.user.department.id;

    // Validate input
    const errors = {};
    if (!name) {
      errors.name = 'Enter a department name';
    }

    if (Object.keys(errors).length > 0) {
      req.session.errors = errors;
      return res.redirect('/settings');
    }

    // Start a transaction
    await db.transaction(async (trx) => {
      // Update department name
      await trx('departments')
        .where('id', departmentId)
        .update({
          name,
          updated_at: new Date()
        });

      // Delete existing domains
      await trx('department_allowed_domains')
        .where('department_id', departmentId)
        .delete();

      // Insert new domains
      if (domains) {
        const domainArray = domains.split('\n')
          .map(domain => domain.trim())
          .filter(domain => domain.length > 0);

        if (domainArray.length > 0) {
          await trx('department_allowed_domains')
            .insert(domainArray.map(domain => ({
              department_id: departmentId,
              domain,
              created_at: new Date(),
              updated_at: new Date()
            })));
        }
      }
    });

    req.session.successMessage = 'Settings updated successfully';
    res.redirect('/settings');
  } catch (error) {
    console.error('Error updating settings:', error);
    req.session.errorMessage = 'There was a problem updating the settings';
    res.redirect('/settings');
  }
};

module.exports = {
  index,
  showServices,
  showService,
  showSettings,
  updateSettings
}; 