const { db } = require('../db');

/**
 * Get all users in a department
 */
async function getUsers(departmentId) {
  return db('users')
    .where('department_id', departmentId)
    .orderBy('email', 'asc');
}

async function getUserById(userId) {
  return db('users')
    .where('id', userId)
    .first();
}

async function createUser(userData) {
  const [user] = await db('users')
    .insert({
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role: userData.role || 'user',
      department_id: userData.departmentId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');

  return user;
}

async function updateUser(userId, userData) {
  const [user] = await db('users')
    .where('id', userId)
    .update({
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role: userData.role,
      updated_at: db.fn.now()
    })
    .returning('*');

  return user;
}

async function deleteUser(userId) {
  await db('users')
    .where('id', userId)
    .del();
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
}; 