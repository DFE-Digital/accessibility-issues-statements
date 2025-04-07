const { db } = require('../db');

/**
 * Verify a magic link token and get user information
 * @param {string} token - Magic link token
 * @returns {Promise<Object|null>} User information or null if token is invalid
 */
async function verifyToken(token) {
  try {
    // Get token record
    const tokenRecord = await db('tokens')
      .where({ token })
      .where('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) {
      return null;
    }

    // Get user information
    const user = await db('users')
      .join('departments', 'users.department_id', 'departments.id')
      .where('users.email', tokenRecord.email)
      .select(
        'users.id as user_id',
        'users.email',
        'users.role',
        'users.first_name',
        'users.last_name',
        'users.last_login',
        'departments.id as department_id',
        'departments.name as department_name'
      )
      .first();

    if (!user) {
      return null;
    }

    // Delete used token
    await db('tokens').where({ token }).del();

    // Update user's last login
    await db('users')
      .where('id', user.user_id)
      .update({ last_login: new Date() });

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

module.exports = {
  verifyToken
}; 