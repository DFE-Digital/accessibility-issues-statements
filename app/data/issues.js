const { db } = require('../db');

/**
 * Get all issues for a service
 * @param {string} serviceId - Service ID (UUID)
 * @returns {Promise<Array>} Array of issues
 */
async function getServiceIssues(serviceId) {
  const issues = await db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('issues.service_id', serviceId)
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for each issue
  for (const issue of issues) {
    // Get WCAG criteria
    const criteria = await db('issue_wcag_criteria')
      .select('wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('issue_wcag_criteria.issue_id', issue.id);
    
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
  const issue = await db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name"),
      'services.name as service_name',
      'services.department_id'
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .leftJoin('services', 'issues.service_id', 'services.id')
    .where('issues.id', issueId)
    .first();

  if (issue) {
    // Get WCAG criteria
    issue.wcag_criteria = await db('issue_wcag_criteria')
      .select('wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('issue_wcag_criteria.issue_id', issueId);

    // Get issue types
    const types = await db('issue_types')
      .select('type')
      .where('issue_id', issueId);
    
    issue.types = types.map(t => t.type);
  }

  return issue;
}

/**
 * Create a new issue
 * @param {Object} issueData - Issue data
 * @param {Array} wcagCriteria - Array of WCAG criteria to associate
 * @param {Array} issueTypes - Array of issue types to associate
 * @returns {Promise<Object>} Created issue
 */
async function createIssue(issueData, wcagCriteria = [], issueTypes = []) {
  const trx = await db.transaction();

  try {
    // Create the issue
    const [issue] = await trx('issues')
      .insert({
        service_id: issueData.service_id,
        title: issueData.title,
        description: issueData.description,
        risk_level: issueData.risk_level,
        source_of_discovery: issueData.source_of_discovery,
        status: issueData.status,
        created_by: issueData.created_by,
        planned_fix: issueData.planned_fix,
        planned_fix_date: issueData.planned_fix_date,
        not_fixing_reason: issueData.not_fixing_reason
      })
      .returning('*');

    // Add WCAG criteria if any are provided
    if (wcagCriteria.length > 0) {
      await trx('issue_wcag_criteria')
        .insert(wcagCriteria.map(criterion => ({
          issue_id: issue.id,
          wcag_criterion: criterion
        })));
    }

    // Add issue types
    if (issueTypes.length > 0) {
      await trx('issue_types')
        .insert(issueTypes.map(type => ({
          issue_id: issue.id,
          type: type
        })));
    }

    await trx.commit();
    return issue;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

/**
 * Update an issue
 * @param {string} issueId - Issue ID (UUID)
 * @param {Object} issueData - Issue data to update
 * @param {Array} wcagCriteria - Array of WCAG criteria to associate
 * @param {Array} issueTypes - Array of issue types to associate
 * @returns {Promise<Object>} Updated issue
 */
async function updateIssue(issueId, issueData, wcagCriteria = [], issueTypes = []) {
  const trx = await db.transaction();

  try {
    // Update the issue
    const [issue] = await trx('issues')
      .where('id', issueId)
      .update({
        title: issueData.title,
        description: issueData.description,
        risk_level: issueData.risk_level,
        source_of_discovery: issueData.source_of_discovery,
        status: issueData.status,
        planned_fix: issueData.planned_fix,
        planned_fix_date: issueData.planned_fix_date,
        not_fixing_reason: issueData.not_fixing_reason,
        updated_at: trx.fn.now()
      })
      .returning('*');

    // Update WCAG criteria
    await trx('issue_wcag_criteria')
      .where('issue_id', issueId)
      .delete();

    if (wcagCriteria.length > 0) {
      await trx('issue_wcag_criteria')
        .insert(wcagCriteria.map(criterion => ({
          issue_id: issueId,
          wcag_criterion: criterion
        })));
    }

    // Update issue types
    await trx('issue_types')
      .where('issue_id', issueId)
      .delete();

    if (issueTypes.length > 0) {
      await trx('issue_types')
        .insert(issueTypes.map(type => ({
          issue_id: issueId,
          type: type
        })));
    }

    await trx.commit();
    return issue;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
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

async function getDepartmentIssues(departmentId) {
  const issues = await db('issues') 
    .select(
      'issues.*',
      'services.name as service_name'
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .where('services.department_id', departmentId)
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for each issue
  for (const issue of issues) {
    // Get WCAG criteria
    const criteria = await db('issue_wcag_criteria')
      .select('wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('issue_wcag_criteria.issue_id', issue.id);
    
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

async function getAllIssues() {
  const issues = await db('issues')
    .select(
      'issues.*',
      'services.name as service_name'
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for each issue
  for (const issue of issues) {
    // Get WCAG criteria
    const criteria = await db('issue_wcag_criteria')
      .select('wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('issue_wcag_criteria.issue_id', issue.id);
    
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

module.exports = {
  getServiceIssues,
  getOpenIssues,
  getIssue,
  createIssue,
  updateIssue,
  updateIssueData,
  getDepartmentIssues,
  getAllIssues
}; 