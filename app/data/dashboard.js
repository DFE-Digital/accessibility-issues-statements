const { db } = require('../db');
const validator = require('validator');

/**
 * Sanitize and validate email address
 * @param {string} email - Email address to validate
 * @returns {string} Sanitized email or throws error
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email address');
  }
  
  const sanitizedEmail = validator.normalizeEmail(email);
  if (!validator.isEmail(sanitizedEmail)) {
    throw new Error('Invalid email address');
  }
  
  return sanitizedEmail;
}

/**
 * Sanitize and validate department ID
 * @param {string} departmentId - Department ID to validate
 * @returns {string} Validated department ID or throws error
 */
function validateDepartmentId(departmentId) {
  if (!departmentId) {
    throw new Error('Department ID is required');
  }
  
  // Check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(departmentId)) {
    throw new Error('Invalid department ID format');
  }
  
  return departmentId;
}

/**
 * Sanitize and validate limit parameter
 * @param {number|string} limit - Limit to validate
 * @returns {number} Validated limit or throws error
 */
function validateLimit(limit) {
  if (!limit) return 5;
  
  const num = parseInt(limit, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('Invalid limit value');
  }
  
  return Math.min(num, 100); // Cap at 100 for safety
}

/**
 * Get user's role and department information
 * @param {string} email - User's email address
 * @returns {Promise<Object>} User information including department details
 */
async function getUserInfo(email) {
  const sanitizedEmail = validateEmail(email);
  
  const user = await db('users')
    .join('departments', 'users.department_id', 'departments.id')
    .where('users.email', sanitizedEmail)
    .select(
      'users.id',
      'users.email',
      'users.role',
      'users.first_name',
      'users.last_name',
      'users.last_login',
      'departments.id as department_id',
      'departments.name as department_name'
    )
    .first();

  return user;
}

/**
 * Get services for a department
 * @param {number} departmentId - Department ID
 * @returns {Promise<Array>} List of services
 */
async function getDepartmentServices(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  return await db('services')
    .where('department_id', validDepartmentId)
    .select('*');
}

/**
 * Get recent issues for a department
 * @param {number} departmentId - Department ID
 * @param {number} limit - Maximum number of issues to return
 * @returns {Promise<Array>} List of recent issues
 */
async function getRecentIssues(departmentId, limit = 5) {
  const validDepartmentId = validateDepartmentId(departmentId);
  const validLimit = validateLimit(limit);
  
  return await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .leftJoin('wcag_criteria', 'issues.wcag_criterion', 'wcag_criteria.criterion')
    .where('services.department_id', validDepartmentId)
    .select(
      'issues.id',
      'issues.title',
      'issues.status',
      'issues.created_at',
      'services.name as service_name',
      'issues.wcag_criterion',
      'wcag_criteria.title as wcag_title',
      'wcag_criteria.level as wcag_level'
    )
    .orderBy('issues.created_at', 'desc')
    .limit(validLimit);
}

/**
 * Get dashboard statistics
 * @param {number} departmentId - Department ID
 * @returns {Promise<Object>} Statistics including total, open, and closed issues
 */
async function getDashboardStats(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  const stats = await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .where('services.department_id', validDepartmentId)
    .select(
      db.raw('COUNT(*) as total_issues'),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as open_issues', ['open']),
      db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as closed_issues', ['closed'])
    )
    .first();

  return stats;
}

module.exports = {
  getUserInfo,
  getDepartmentServices,
  getRecentIssues,
  getDashboardStats
}; 