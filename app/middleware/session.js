const { db } = require('../db');

module.exports = async (req, res, next) => {
  if (req.session.user) {
    try {
      // Get the latest user data
      const user = await db('users')
        .select('users.*', 'departments.name as department_name', 'departments.id as department_id', 'departments.brand as department_brand')
        .leftJoin('departments', 'users.department_id', 'departments.id')
        .where('users.id', req.session.user.id)
        .first();

      if (user) {
        // Update session with latest user data
        req.session.user = {
          ...req.session.user,
          ...user,
          department: {
            id: user.department_id,
            name: user.department_name,
            brand: user.department_brand
          }
        };
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }
  next();
}; 