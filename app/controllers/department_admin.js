const { db } = require('../db');

const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const departmentId = req.session.user.department.id;

    // Get department stats
    const department = await db('departments')
      .select('departments.*')
      .where('departments.id', departmentId)
      .first();

    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }

    // Get all services for the department
    const services = await db('services')
      .select(
        'services.*',
        db.raw('COUNT(DISTINCT issues.id) as open_issues_count')
      )
      .leftJoin('issues', 'services.id', 'issues.service_id')
      .where('services.department_id', departmentId)
      .groupBy(
        'services.id',
        'services.name',
        'services.url',
        'services.department_id',
        'services.service_owner_id',
        'services.external_id',
        'services.created_at',
        'services.updated_at',
        'services.statement_enrolled',
        'services.numeric_id',
        'services.business_area_id'
      )
      .orderBy('services.name');

    // Get recent issues for the department
    const recentIssues = await db('issues')
      .select(
        'issues.*',
        'services.name as service_name',
        'services.url as service_url'
      )
      .join('services', 'issues.service_id', 'services.id')
      .where('services.department_id', departmentId)
      .orderBy('issues.created_at', 'desc')
      .limit(5);

    // Get total open issues
    const totalOpenIssues = await db('issues')
      .join('services', 'issues.service_id', 'services.id')
      .where('services.department_id', departmentId)
      .where('issues.status', 'open')
      .count('* as count')
      .first();

    // Get overdue issues
    const overdueIssues = await db('issues')
      .join('services', 'issues.service_id', 'services.id')
      .where('services.department_id', departmentId)
      .where('issues.status', 'open')
      .where('issues.planned_fix_date', '<', new Date())
      .count('* as count')
      .first();

    // Get compliant services (services with no open issues)
    const compliantServices = await db('services')
      .select('services.id')
      .leftJoin('issues', function() {
        this.on('services.id', '=', 'issues.service_id')
          .andOn('issues.status', '=', db.raw("'open'"));
      })
      .where('services.department_id', departmentId)
      .groupBy('services.id')
      .having(db.raw('COUNT(issues.id)'), '=', 0)
      .count('* as count')
      .first();

    // Get WCAG issues by level
    const wcagLevels = await db('issue_wcag_criteria')
      .select(
        'wcag_criteria.level',
        db.raw('COUNT(DISTINCT issues.id) as count')
      )
      .join('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
      .join('services', 'issues.service_id', 'services.id')
      .join('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('services.department_id', departmentId)
      .where('issues.status', 'open')
      .groupBy('wcag_criteria.level');

    // Get common WCAG issues
    const commonIssues = await db('issue_wcag_criteria')
      .select(
        'wcag_criteria.criterion',
        'wcag_criteria.title',
        'wcag_criteria.level',
        db.raw('COUNT(DISTINCT issues.id) as count')
      )
      .join('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
      .join('services', 'issues.service_id', 'services.id')
      .join('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('services.department_id', departmentId)
      .where('issues.status', 'open')
      .groupBy('wcag_criteria.criterion', 'wcag_criteria.title', 'wcag_criteria.level')
      .orderBy('count', 'desc')
      .limit(5);

    res.render('dashboard/department_admin/index', {
      department,
      totalServices: services.length,
      totalOpenIssues: totalOpenIssues.count,
      overdueIssues: overdueIssues.count,
      compliantServices: compliantServices.count,
      services,
      recentIssues,
      levelAIssues: wcagLevels.find(l => l.level === 'A')?.count || 0,
      levelAAIssues: wcagLevels.find(l => l.level === 'AA')?.count || 0,
      levelAAAIssues: wcagLevels.find(l => l.level === 'AAA')?.count || 0,
      commonIssues
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
        db.raw('COUNT(DISTINCT user_services.user_id) as enrolled_users'),
        db.raw('(SELECT COUNT(*) FROM issues WHERE issues.service_id = services.id AND issues.status = \'open\') as open_issues_count')
      )
      .leftJoin('user_services', 'services.id', 'user_services.service_id')
      .where('services.department_id', req.session.user.department.id)
      .whereRaw('(SELECT COUNT(*) FROM issues WHERE issues.service_id = services.id AND issues.status = \'open\') > 0')
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

const showBusinessAreas = async (req, res) => {

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

    res.render('department_admin/settings/business-areas', {
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
  updateSettings,
  showBusinessAreas
}; 