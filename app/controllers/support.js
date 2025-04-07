const { db } = require('../db');

const index = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;

    // For super users, show a different message since they don't belong to a department
    if (user.role === 'super_admin') {
      return res.render('support/index', {
        user,
        isSuperUser: true
      });
    }

    // Get all department admin information
    const departmentAdmins = await db('users')
      .select('id', 'first_name', 'last_name', 'email')
      .where('department_id', user.department.id)
      .where('role', 'department_admin')
      .orderBy('first_name');

    res.render('support/index', {
      user,
      departmentAdmins,
      isSuperUser: false
    });
  } catch (error) {
    console.error('Support page error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the support page',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  index
}; 