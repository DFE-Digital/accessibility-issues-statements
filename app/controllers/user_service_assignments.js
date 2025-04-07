const { db } = require('../db');
const { getDepartmentServices } = require('../data/services');

const index = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const { userId } = req.params;
    const user = req.session.user;

    // Only department admins can manage user-service assignments
    if (user.role !== 'department_admin') {
      return res.status(403).render('error', {
        error: 'Access denied',
        details: 'You do not have permission to manage user service assignments'
      });
    }

    // Get all services in the department
    const departmentServices = await getDepartmentServices(user.department.id);

    // Get the user's assigned services
    const userServices = await db('user_services')
      .select('service_id')
      .where('user_id', userId);

    const assignedServiceIds = userServices.map(us => us.service_id);

    // Mark services as assigned or not
    const services = departmentServices.map(service => ({
      ...service,
      assigned: assignedServiceIds.includes(service.id)
    }));

    res.render('services/user_assignments/index', {
      services,
      userId,
      user
    });
  } catch (error) {
    console.error('User service assignments error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the service assignments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const { userId } = req.params;
    const user = req.session.user;
    const { serviceIds } = req.body;

    // Only department admins can manage user-service assignments
    if (user.role !== 'department_admin') {
      return res.status(403).render('error', {
        error: 'Access denied',
        details: 'You do not have permission to manage user service assignments'
      });
    }

    // Start a transaction
    await db.transaction(async trx => {
      // Delete all existing assignments for this user
      await trx('user_services')
        .where('user_id', userId)
        .delete();

      // If serviceIds is provided, insert new assignments
      if (serviceIds && serviceIds.length > 0) {
        const assignments = serviceIds.map(serviceId => ({
          user_id: userId,
          service_id: serviceId,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await trx('user_services').insert(assignments);
      }
    });

    // Redirect back to the user management page
    res.redirect('/services/department-admin/users');
  } catch (error) {
    console.error('User service assignments update error:', error);
    res.status(500).render('error', {
      error: 'There was a problem updating the service assignments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  index,
  update
}; 