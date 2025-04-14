const dashboardData = require('../data/dashboard');
const validator = require('validator');
const { getDepartmentServices } = require('../data/services');
const { getServiceIssues } = require('../data/issues');
const { getUserServices } = require('../data/services');
const { db } = require('../db');
const departmentAdminController = require('./department_admin');

/**
 * Safely escape a string value, returning empty string for undefined/null
 * @param {string} value - Value to escape
 * @returns {string} Escaped string or empty string
 */
function safeEscape(value) {
  return value ? validator.escape(String(value)) : '';
}

/**
 * Render the dashboard page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function index(req, res) {
  try {
    if (!req.session.user || !req.session.user.email) {
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;

    if (!user) {
      return res.redirect('/auth/sign-in');
    }

    // Use department_admin controller for department admin users
    if (user.role === 'department_admin') {
      return departmentAdminController.index(req, res);
    }

    // Get user's assigned issues and owned services
    const [assignedIssues, ownedServices, userServices] = await Promise.all([
      // Get issues assigned to the user
      db('issues')
        .select(
          'issues.*',
          'services.name as service_name',
          'services.url as service_url'
        )
        .leftJoin('services', 'issues.service_id', 'services.id')
        .where('issues.assigned_to', user.id)
        .where('issues.status', 'open')
        .orderBy('issues.created_at', 'desc'),
      
      // Get services where user is the owner
      db('services')
        .select('*')
        .where('service_owner_id', user.id),
      
      // Get all services the user has access to
      getUserServices(user.id)
    ]);

    // Get issues raised by the user
    const raisedIssues = await db('issues')
      .select(
        'issues.*',
        'services.name as service_name',
        'services.url as service_url'
      )
      .leftJoin('services', 'issues.service_id', 'services.id')
      .where('issues.created_by', user.id)
      .where('issues.status', 'open')
      .orderBy('issues.created_at', 'desc');

    // Sanitize and process data before rendering
    const sanitizedData = {
      user: {
        ...user,
        first_name: safeEscape(user.first_name),
        last_name: safeEscape(user.last_name),
        email: safeEscape(user.email),
        department_name: safeEscape(user.department_name)
      },
      
      // User's assigned issues
      assignedIssues: (assignedIssues || []).map(issue => ({
        ...issue,
        title: safeEscape(issue.title),
        service_name: safeEscape(issue.service_name),
        service_url: safeEscape(issue.service_url)
      })),
      
      // Services where user is the owner
      ownedServices: (ownedServices || []).map(service => ({
        ...service,
        name: safeEscape(service.name),
        url: safeEscape(service.url)
      })),
      
      // Issues raised by the user
      raisedIssues: (raisedIssues || []).map(issue => ({
        ...issue,
        title: safeEscape(issue.title),
        service_name: safeEscape(issue.service_name),
        service_url: safeEscape(service.service_url)
      })),
      
      // All services the user has access to
      userServices: (userServices || []).map(service => ({
        ...service,
        name: safeEscape(service.name),
        url: safeEscape(service.url)
      }))
    };

    if (user.role === 'user') {
      return res.render('dashboard/user/index', sanitizedData);
    }

    if (user.role === 'super_admin') {
      return res.render('dashboard/super_admin/index', sanitizedData);
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Determine the compliance status of a service based on its issues
 * @param {Object} service - Service data object
 * @returns {string} Status: 'compliant', 'partially', or 'non-compliant'
 */
function determineServiceStatus(service) {
  if (!service?.open_issues_count) {
    return 'compliant';
  }
  if (service?.high_priority_issues > 0) {
    return 'non-compliant';
  }
  return 'partially';
}

async function getDashboardData(req, res) {
  try {
    const user = req.session.user;
    const services = await getDepartmentServices(user.department.id);
    
    // Get all issues for the department
    const allIssues = [];
    for (const service of services) {
      const issues = await getServiceIssues(service.id);
      allIssues.push(...issues);
    }

    // Count services
    const servicesCount = services.length;

    // Count open issues
    const openIssues = allIssues.filter(issue => issue.status === 'open');
    const openIssuesCount = openIssues.length;

    // Count overdue issues
    const today = new Date();
    const overdueIssuesCount = openIssues.filter(issue => 
      issue.planned_fix === true && 
      issue.planned_fix_date && 
      new Date(issue.planned_fix_date) < today
    ).length;

    // Count issues by WCAG level
    const wcagLevels = {};
    openIssues.forEach(issue => {
      if (issue.wcag_criteria) {
        issue.wcag_criteria.forEach(criterion => {
          wcagLevels[criterion.level] = (wcagLevels[criterion.level] || 0) + 1;
        });
      }
    });

    // Format WCAG levels data for chart
    const wcagLevelsData = Object.entries(wcagLevels).map(([level, count]) => ({
      level,
      count
    }));

    // Count issues by WCAG criterion
    const wcagCriteria = {};
    openIssues.forEach(issue => {
      if (issue.wcag_criteria) {
        issue.wcag_criteria.forEach(criterion => {
          const key = `${criterion.criterion} - ${criterion.title}`;
          wcagCriteria[key] = (wcagCriteria[key] || 0) + 1;
        });
      }
    });

    // Get top 5 WCAG criteria
    const topWcagCriteria = Object.entries(wcagCriteria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([criterion, count]) => ({
        criterion,
        count
      }));

    res.json({
      servicesCount,
      openIssuesCount,
      overdueIssuesCount,
      wcagLevels: wcagLevelsData,
      topWcagCriteria
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
}

module.exports = {
  index,
  getDashboardData
}; 