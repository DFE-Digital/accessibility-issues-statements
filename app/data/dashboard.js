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
 * Get services for a department with issue details
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} List of services with issue details
 */
async function getDepartmentServices(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  // Get services with issue counts using SQL Server syntax
  const services = await db.raw(`
    SELECT 
      s.id,
      s.name,
      s.url,
      s.department_id,
      s.service_owner_id,
      s.created_at,
      s.updated_at,
      COUNT(DISTINCT CASE WHEN i.status = 'open' THEN i.id END) as open_issues_count,
      COUNT(DISTINCT CASE WHEN i.risk_level = 'high' AND i.status = 'open' THEN i.id END) as high_priority_issues,
      COUNT(DISTINCT iwc.wcag_criterion) as wcag_criteria_count,
      MAX(CASE 
        WHEN i.risk_level = 'high' THEN 'high'
        WHEN i.risk_level = 'medium' THEN 'medium'
        ELSE 'low'
      END) as risk_level
    FROM services s
    LEFT JOIN issues i ON s.id = i.service_id
    LEFT JOIN issue_wcag_criteria iwc ON i.id = iwc.issue_id
    WHERE s.department_id = ?
    GROUP BY 
      s.id,
      s.name,
      s.url,
      s.department_id,
      s.service_owner_id,
      s.created_at,
      s.updated_at
  `, [validDepartmentId]);

  // Get issue types for each service
  for (const service of services) {
    const types = await db.raw(`
      SELECT DISTINCT it.type
      FROM services s
      JOIN issues i ON s.id = i.service_id
      JOIN issue_types it ON i.id = it.issue_id
      WHERE s.id = ?
      AND i.status = 'open'
    `, [service.id]);

    service.types = types.map(t => t.type);
  }

  return services;
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
  
  // Use TOP instead of LIMIT for SQL Server
  const issues = await db.raw(`
    SELECT TOP (?) 
      issues.id,
      issues.title,
      issues.status,
      issues.created_at,
      services.name as service_name
    FROM issues
    JOIN services ON issues.service_id = services.id
    WHERE services.department_id = ?
    ORDER BY issues.created_at DESC
  `, [validLimit, validDepartmentId]);

  // Get WCAG criteria and types for each issue
  for (const issue of issues) {
    // Get WCAG criteria using SQL Server syntax
    const criteria = await db.raw(`
      SELECT wcag_criteria.*
      FROM issue_wcag_criteria
      LEFT JOIN wcag_criteria ON issue_wcag_criteria.wcag_criterion = wcag_criteria.criterion
      WHERE issue_wcag_criteria.issue_id = ?
    `, [issue.id]);
    
    issue.wcag_criteria = criteria;

    // Set the highest WCAG level as the issue's main level for filtering
    if (criteria.length > 0) {
      const levels = criteria.map(c => c.level).filter(l => l);
      issue.wcag_level = levels.includes('A') ? 'A' : levels.includes('AA') ? 'AA' : levels.includes('AAA') ? 'AAA' : null;
    }

    // Get issue types
    const types = await db('issue_types')
      .select('type')
      .where('issue_id', issue.id);
    
    issue.types = types.map(t => t.type);
  }

  return issues;
}

/**
 * Get WCAG statistics for a department
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} WCAG statistics including counts by level
 */
async function getWcagStats(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  // Get counts of issues by WCAG level using SQL Server syntax
  const stats = await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .join('issue_wcag_criteria', 'issues.id', 'issue_wcag_criteria.issue_id')
    .join('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .where('services.department_id', validDepartmentId)
    .where('issues.status', 'open')
    .select(
      db.raw('COUNT(DISTINCT CASE WHEN wcag_criteria.level = ? THEN issues.id END) as level_a', ['A']),
      db.raw('COUNT(DISTINCT CASE WHEN wcag_criteria.level = ? THEN issues.id END) as level_aa', ['AA'])
    )
    .first();

  return {
    level_a: stats?.level_a || 0,
    level_aa: stats?.level_aa || 0
  };
}

/**
 * Get most common issues for a department
 * @param {string} departmentId - Department ID
 * @param {number} limit - Maximum number of issues to return
 * @returns {Promise<Array>} List of common issues with counts
 */
async function getCommonIssues(departmentId, limit = 5) {
  const validDepartmentId = validateDepartmentId(departmentId);
  const validLimit = validateLimit(limit);
  
  // Use SQL Server string aggregation with STRING_AGG
  const issues = await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .leftJoin('issue_types', 'issues.id', 'issue_types.issue_id')
    .where('services.department_id', validDepartmentId)
    .where('issues.status', 'open')
    .select(
      'issues.title',
      db.raw('COUNT(*) as count'),
      db.raw('STRING_AGG(CONVERT(NVARCHAR(MAX), issue_types.type), \',\') as types')
    )
    .groupBy('issues.title')
    .orderBy('count', 'desc')
    .limit(validLimit);

  return issues.map(issue => ({
    title: issue.title,
    count: parseInt(issue.count),
    type: (issue.types || '').split(',')[0] || 'Unknown' // Use first type or 'Unknown'
  }));
}

/**
 * Get urgent actions for a department
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Counts of various urgent issues
 */
async function getUrgentActions(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  // Use Knex query builder instead of raw SQL for better parameter handling
  const actions = await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .where('services.department_id', validDepartmentId)
    .where('issues.status', 'open')
    .select(
      db.raw('COUNT(CASE WHEN issues.planned_fix = 1 AND issues.planned_fix_date < GETDATE() THEN 1 END) as overdue'),
      db.raw('COUNT(CASE WHEN issues.planned_fix = 1 AND issues.planned_fix_date BETWEEN GETDATE() AND DATEADD(day, 7, GETDATE()) THEN 1 END) as due_this_week'),
      db.raw('COUNT(CASE WHEN issues.planned_fix = 0 AND issues.not_fixing_reason IS NOT NULL THEN 1 END) as wont_fix')
    )
    .first();

  return {
    overdue: actions?.overdue || 0,
    due_this_week: actions?.due_this_week || 0,
    wont_fix: actions?.wont_fix || 0
  };
}

/**
 * Get dashboard statistics
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Statistics including total services, issues, and users
 */
async function getDashboardStats(departmentId) {
  const validDepartmentId = validateDepartmentId(departmentId);
  
  // Get service and issue counts
  const serviceStats = await db('services')
    .where('department_id', validDepartmentId)
    .select(
      db.raw('COUNT(DISTINCT services.id) as total_services'),
      db.raw('COUNT(DISTINCT CASE WHEN issues.status = ? THEN issues.id END) as open_issues', ['open'])
    )
    .leftJoin('issues', 'services.id', 'issues.service_id')
    .first();

  // Get active users count - using SQL Server compatible DATEADD
  const userStats = await db('users')
    .where('department_id', validDepartmentId)
    .where('last_login', '>', db.raw('DATEADD(day, -30, GETDATE())'))
    .select(db.raw('COUNT(*) as active_users'))
    .first();

  return {
    total_services: serviceStats?.total_services || 0,
    open_issues: serviceStats?.open_issues || 0,
    statement_views: 0,
    active_users: userStats?.active_users || 0
  };
}

module.exports = {
  getUserInfo,
  getDepartmentServices,
  getRecentIssues,
  getDashboardStats,
  getWcagStats,
  getCommonIssues,
  getUrgentActions
}; 