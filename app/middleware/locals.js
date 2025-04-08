// Add common variables to all views
const addLocals = (req, res, next) => {
  // Add user and department info if user is logged in
  if (req.session.user) {
    res.locals.user = req.session.user;
    res.locals.department = req.session.user.department;
  }

  next();
};

module.exports = {
  addLocals
}; 