const { db } = require('../db');

/**
 * Get all issues for a service
 * @param {string} serviceId - Service ID (UUID)
 * @returns {Promise<Array>} Array of issues
 */
async function getServiceIssues(serviceId) {
  return db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name"),
      'wcag_criteria.title as wcag_title',
      'wcag_criteria.level as wcag_level',
      'wcag_criteria.version as wcag_version'
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .leftJoin('wcag_criteria', 'issues.wcag_criterion', 'wcag_criteria.criterion')
    .where('issues.service_id', serviceId)
    .orderBy('issues.created_at', 'desc');
}

/**
 * Get open issues for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of open issues
 */
async function getOpenIssues(serviceId) {
  return db('issues')
    .where({
      service_id: serviceId,
      status: 'open'
    })
    .select('*')
    .orderBy('created_at', 'desc');
}

/**
 * Get a single issue by ID
 * @param {string} issueId - Issue ID (UUID)
 * @returns {Promise<Object>} Issue object
 */
async function getIssue(issueId) {
  return db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name"),
      'services.name as service_name',
      'services.department_id',
      'wcag_criteria.title as wcag_title',
      'wcag_criteria.level as wcag_level',
      'wcag_criteria.version as wcag_version',
      'wcag_criteria.guidance_url as guidance_url'  
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('wcag_criteria', 'issues.wcag_criterion', 'wcag_criteria.criterion')
    .where('issues.id', issueId)
    .first();
}

/**
 * Create a new issue
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue
 */
async function createIssue(issueData) {
  const [issue] = await db('issues')
    .insert(issueData)
    .returning('*');

  return issue;
}

/**
 * Update an issue
 * @param {string} issueId - Issue ID (UUID)
 * @param {Object} issueData - Issue data to update
 * @returns {Promise<Object>} Updated issue
 */
async function updateIssue(issueId, issueData) {
  const [issue] = await db('issues')
    .where('id', issueId)
    .update({
      ...issueData,
      updated_at: db.fn.now()
    })
    .returning('*');

  return issue;
}

/**
 * Update issue data
 * @param {string} id - Issue ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} Updated issue
 */
async function updateIssueData(id, data) {
  const [issue] = await db('issues')
    .where('id', id)
    .update({
      ...data,
      updated_at: db.fn.now()
    })
    .returning('*');
  return issue;
}

module.exports = {
  getServiceIssues,
  getOpenIssues,
  getIssue,
  createIssue,
  updateIssue,
  updateIssueData
}; 