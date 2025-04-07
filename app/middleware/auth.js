/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/sign-in');
  }
  next();
};

/**
 * Middleware to check if user is a department admin
 */
const isDepartmentAdmin = (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'department_admin' && req.session.user.role !== 'super_admin')) {
    return res.status(403).render('error', {
      error: {
        title: 'Access denied',
        message: 'You must be a department admin to access this page'
      }
    });
  }
  next();
};

/**
 * Middleware to check if user is a super admin
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'super_admin') {
    return res.status(403).render('error', {
      error: {
        title: 'Access denied',
        message: 'You must be a super admin to access this page'
      }
    });
  }
  next();
};

module.exports = {
  isAuthenticated,
  isDepartmentAdmin,
  isSuperAdmin
}; 