const { db } = require('../db');

const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    // Get department stats
    const department = await db('departments')
      .select('departments.*')
      .where('departments.id', req.session.user.department_id)
      .first();

    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }

    // Get service count
    const servicesCount = await db('services')
      .where('department_id', req.session.user.department_id)
      .count('* as count')
      .first();

    // Get user count
    const usersCount = await db('users')
      .where('department_id', req.session.user.department_id)
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
      .where('services.department_id', req.session.user.department_id)
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
        'services.department_id': req.session.user.department_id
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

module.exports = {
  index,
  showServices,
  showService
}; 