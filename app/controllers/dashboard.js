const dashboardData = require('../data/dashboard');
const validator = require('validator');

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
    const user = await dashboardData.getUserInfo(req.session.user.email);

    if (!user) {
      return res.redirect('/auth/sign-in');
    }

    // Get dashboard data
    const [services, recentIssues, stats] = await Promise.all([
      dashboardData.getDepartmentServices(user.department_id),
      dashboardData.getRecentIssues(user.department_id),
      dashboardData.getDashboardStats(user.department_id)
    ]);

    // Sanitize data before rendering
    const sanitizedData = {
      user: {
        ...user,
        first_name: user.first_name ? validator.escape(user.first_name) : '',
        last_name: user.last_name ? validator.escape(user.last_name) : '',
        email: validator.escape(user.email),
        department_name: validator.escape(user.department_name)
      },
      services: services.map(service => ({
        ...service,
        name: validator.escape(service.name),
        url: validator.escape(service.url)
      })),
      recentIssues: recentIssues.map(issue => ({
        ...issue,
        title: validator.escape(issue.title),
        service_name: validator.escape(issue.service_name)
      })),
      stats
    };

    // if department_admin render /dashboard/department_admin/index
    if (user.role === 'department_admin') {
      return res.render('dashboard/department_admin/index', sanitizedData);
    }

    // if department_user render /dashboard/user/index

    if (user.role === 'user') {
      return res.render('dashboard/user/index', sanitizedData);

    }

    if (user.role === 'super_admin') {
      return res.render('dashboard/super_admin/index', sanitizedData);

    }

  } catch (error) {

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

module.exports = {
  index
}; 