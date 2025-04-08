const dashboardData = require('../data/dashboard');
const validator = require('validator');

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

    // Get user information
    const user = req.session.user;

    if (!user) {
      return res.redirect('/auth/sign-in');
    }

    // Get dashboard data
    const [
      services,
      recentIssues,
      stats,
      wcagStats,
      commonIssues,
      urgentActions
    ] = await Promise.all([
      dashboardData.getDepartmentServices(user.department.id),
      dashboardData.getRecentIssues(user.department.id),
      dashboardData.getDashboardStats(user.department.id),
      dashboardData.getWcagStats(user.department.id),
      dashboardData.getCommonIssues(user.department.id),
      dashboardData.getUrgentActions(user.department.id)
    ]);

    // Process services data to include status
    const processedServices = (services || []).map(service => ({
      ...service,
      name: safeEscape(service.name),
      url: safeEscape(service.url),
      openIssues: service.open_issues_count || 0,
      statementViews: service.statement_views || 0,
      status: determineServiceStatus(service)
    }));

    // Sanitize and process data before rendering
    const sanitizedData = {
      user: {
        ...user,
        first_name: safeEscape(user.first_name),
        last_name: safeEscape(user.last_name),
        email: safeEscape(user.email),
        department_name: safeEscape(user.department_name)
      },
      // Summary statistics
      totalServices: stats?.total_services || 0,
      totalOpenIssues: stats?.open_issues || 0,
      totalStatementViews: stats?.statement_views || 0,
      activeUsers: stats?.active_users || 0,
      
      // WCAG compliance data
      levelAIssues: wcagStats?.level_a || 0,
      levelAAIssues: wcagStats?.level_aa || 0,
      
      // Urgent actions
      overdueIssues: urgentActions?.overdue || 0,
      dueThisWeek: urgentActions?.due_this_week || 0,
      noResolveIssues: urgentActions?.wont_fix || 0,
      
      // Services table data
      services: processedServices,
      
      // Common issues list
      commonIssues: (commonIssues || []).map(issue => ({
        count: issue.count || 0,
        title: safeEscape(issue.title),
        type: issue.type || 'Unknown'
      })),
      
      // Recent issues
      recentIssues: (recentIssues || []).map(issue => ({
        ...issue,
        title: safeEscape(issue.title),
        service_name: safeEscape(issue.service_name)
      }))
    };

    // Render appropriate dashboard based on user role
    if (user.role === 'department_admin') {
      return res.render('dashboard/department_admin/index', sanitizedData);
    }

    if (user.role === 'user') {
      return res.render('dashboard/user/index', sanitizedData);
    }

    if (user.role === 'super_admin') {
      return res.render('dashboard/super_admin/index', sanitizedData);
    }

  } catch (error) {
    console.log(error);

    // Handle validation errors specifically
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).render('error', {
        error: 'Invalid request data',
        details: error.message
      });
    }

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

module.exports = {
  index
}; 