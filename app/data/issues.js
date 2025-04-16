const { db } = require('../db');

/**
 * Get all issues for a service
 * @param {string} serviceId - Service ID (UUID)
 * @returns {Promise<Array>} Array of issues
 */
async function getServiceIssues(serviceId) {
  // First get the issues with basic info
  const issues = await db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('issues.service_id', serviceId)
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for all issues in one query each
  const issueIds = issues.map(issue => issue.id);
  
  // Get WCAG criteria for all issues
  const criteria = await db('issue_wcag_criteria')
    .select(
      'issue_wcag_criteria.issue_id',
      'wcag_criteria.*'
    )
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .whereIn('issue_wcag_criteria.issue_id', issueIds);

  // Get types for all issues
  const types = await db('issue_types')
    .select('issue_id', 'type')
    .whereIn('issue_id', issueIds);

  // Group criteria and types by issue_id
  const criteriaByIssue = criteria.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr);
    return acc;
  }, {});

  const typesByIssue = types.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.type);
    return acc;
  }, {});

  // Combine all the data
  return issues.map(issue => ({
    ...issue,
    wcag_criteria: criteriaByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || [],
    wcag_level: getHighestWcagLevel(criteriaByIssue[issue.id] || [])
  }));
}

/**
 * Get open issues for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of open issues
 */
async function getOpenIssues(serviceId) {
  // First get the issues with basic info
  const issues = await db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where({
      'issues.service_id': serviceId,
      'issues.status': 'open'
    })
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for all issues in one query each
  const issueIds = issues.map(issue => issue.id);
  
  // Get WCAG criteria for all issues
  const criteria = await db('issue_wcag_criteria')
    .select(
      'issue_wcag_criteria.issue_id',
      'wcag_criteria.*'
    )
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .whereIn('issue_wcag_criteria.issue_id', issueIds);

  // Get types for all issues
  const types = await db('issue_types')
    .select('issue_id', 'type')
    .whereIn('issue_id', issueIds);

  // Group criteria and types by issue_id
  const criteriaByIssue = criteria.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr);
    return acc;
  }, {});

  const typesByIssue = types.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.type);
    return acc;
  }, {});

  // Combine all the data
  return issues.map(issue => ({
    ...issue,
    wcag_criteria: criteriaByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || [],
    wcag_level: getHighestWcagLevel(criteriaByIssue[issue.id] || [])
  }));
}

/**
 * Get a single issue by ID
 * @param {string} issueId - Issue ID (UUID)
 * @returns {Promise<Object>} Issue object
 */
async function getIssue(issueId) {
  // First get the basic issue data
  const issue = await db('issues')
    .where('id', issueId)
    .first();

  if (!issue) {
    return null;
  }

  // Get the created by user name
  const createdBy = await db('users')
    .where('id', issue.created_by)
    .select(db.raw("CONCAT(first_name, ' ', last_name) as name"))
    .first();

  // Get the service data
  const service = await db('services')
    .where('id', issue.service_id)
    .select('name', 'department_id')
    .first();

  // Get the assigned user name if there is one
  let assignedToName = null;
  let assignedToEmail = null;
  if (issue.assigned_to) {
    const assignedUser = await db('users')
      .where('id', issue.assigned_to)
      .select(
        db.raw("CONCAT(first_name, ' ', last_name) as name"),
        'email'
      )
      .first();
    assignedToName = assignedUser?.name || null;
    assignedToEmail = assignedUser?.email || null;
  }

  // Get WCAG criteria
  const criteria = await db('issue_wcag_criteria')
    .select('wcag_criteria.*')
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .where('issue_wcag_criteria.issue_id', issueId);

  // Get issue types
  const types = await db('issue_types')
    .select('type')
    .where('issue_id', issueId);

  // Combine all the data
  return {
    ...issue,
    created_by_name: createdBy?.name || null,
    service_name: service?.name || null,
    department_id: service?.department_id || null,
    assigned_to_name: assignedToName,
    assigned_to_email: assignedToEmail,
    wcag_criteria: criteria || [],
    types: types.map(t => t.type)
  };
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
    // Get the department_id from the service
    const service = await trx('services')
      .select('department_id')
      .where('id', issueData.service_id)
      .first();

    if (!service) {
      throw new Error('Service not found');
    }

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
          wcag_criterion: criterion,
          department_id: service.department_id
        })));
    }

    // Add issue types
    if (issueTypes.length > 0) {
      await trx('issue_types')
        .insert(issueTypes.map(type => ({
          issue_id: issue.id,
          type: type,
          department_id: service.department_id
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
    // Get the existing issue to get the service_id
    const existingIssue = await trx('issues')
      .select('service_id')
      .where('id', issueId)
      .first();

    if (!existingIssue) {
      throw new Error('Issue not found');
    }

    // Get the department_id from the service
    const service = await trx('services')
      .select('department_id')
      .where('id', existingIssue.service_id)
      .first();

    if (!service) {
      throw new Error('Service not found');
    }

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
        closed_date: issueData.closed_date,
        updated_at: trx.fn.now()
      })
      .returning('*');

    // Only update WCAG criteria if they are provided
    if (wcagCriteria.length > 0) {
      await trx('issue_wcag_criteria')
        .where('issue_id', issueId)
        .delete();

      await trx('issue_wcag_criteria')
        .insert(wcagCriteria.map(criterion => ({
          issue_id: issueId,
          wcag_criterion: criterion,
          department_id: service.department_id
        })));
    }

    // Only update issue types if they are provided
    if (issueTypes.length > 0) {
      await trx('issue_types')
        .where('issue_id', issueId)
        .delete();

      await trx('issue_types')
        .insert(issueTypes.map(type => ({
          issue_id: issueId,
          type: type,
          department_id: service.department_id
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

/**
 * Get all issues across all departments
 * @returns {Promise<Array>} Array of issues
 */
async function getAllIssues() {
  const issues = await db('issues')
    .select(
      'issues.*',
      'services.name as service_name',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('users', 'issues.created_by', 'users.id')
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
 * Get all issues for a specific department
 * @param {string} departmentId - Department ID (UUID)
 * @returns {Promise<Array>} Array of issues
 */
async function getDepartmentIssues(departmentId) {
  // First get the issues with basic info
  const issues = await db('issues')
    .select(
      'issues.*',
      'services.name as service_name',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('services.department_id', departmentId)
    .orderBy('issues.created_at', 'desc');

  // Get WCAG criteria and types for all issues in one query each
  const issueIds = issues.map(issue => issue.id);
  
  // Get WCAG criteria for all issues
  const criteria = await db('issue_wcag_criteria')
    .select(
      'issue_wcag_criteria.issue_id',
      'wcag_criteria.*'
    )
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .whereIn('issue_wcag_criteria.issue_id', issueIds);

  // Get types for all issues
  const types = await db('issue_types')
    .select('issue_id', 'type')
    .whereIn('issue_id', issueIds);

  // Group criteria and types by issue_id
  const criteriaByIssue = criteria.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr);
    return acc;
  }, {});

  const typesByIssue = types.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.type);
    return acc;
  }, {});

  // Combine all the data
  return issues.map(issue => ({
    ...issue,
    wcag_criteria: criteriaByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || [],
    wcag_level: getHighestWcagLevel(criteriaByIssue[issue.id] || [])
  }));
}

// Get all open issues for a department
async function getDepartmentOpenIssues(departmentId, page = 1, limit = 10) {
  // Ensure page and limit are valid numbers
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
  // Calculate offset
  const offset = (page - 1) * limit;

  // Get total count first
  const totalCount = await db('issues')
    .join('services', 'issues.service_id', 'services.id')
    .where('services.department_id', departmentId)
    .where('issues.status', 'open')
    .count('* as count')
    .first();

  // Get paginated issues
  const issues = await db('issues')
    .select(
      'issues.*',
      'services.name as service_name',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('services.department_id', departmentId)
    .where('issues.status', 'open')
    .orderBy('issues.created_at', 'desc')
    .offset(offset)
    .limit(limit);

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

    // Get issue types - ensure we're getting all types regardless of status
    const types = await db('issue_types')
      .select('type')
      .where('issue_id', issue.id);
    
    issue.types = types.map(t => t.type);
  }

  return {
    issues,
    pagination: {
      total: parseInt(totalCount.count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalCount.count) / limit)
    }
  };
}

async function getIssuesByCriterion(criterion) {
  const issues = await db('issue_wcag_criteria')
    .select(
      'issues.id',
      'issues.title as issue_title',
      'issues.description',
      'issues.status',
      'issues.risk_level',
      'issues.source_of_discovery',
      'issues.created_at',
      'issues.updated_at',
      'issues.service_id',
      'issues.created_by',
      'issues.assigned_to',
      'issues.planned_fix',
      'issues.planned_fix_date',
      'issues.not_fixing_reason',
      'wcag_criteria.criterion',
      'wcag_criteria.title as wcag_title',
      'wcag_criteria.level',
      'services.name as service_name',
      'services.url as service_url'
    )
    .leftJoin('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .leftJoin('services', 'issues.service_id', 'services.id')
    .where('issue_wcag_criteria.wcag_criterion', criterion)
    .orderBy('issues.created_at', 'desc');

  return issues;
}

// Helper function to determine highest WCAG level
function getHighestWcagLevel(criteria) {
  if (!criteria || !criteria.length) return null;
  const levels = criteria.map(c => c.level).filter(l => l);
  return levels.includes('A') ? 'A' : levels.includes('AA') ? 'AA' : levels.includes('AAA') ? 'AAA' : null;
}

module.exports = {
  getIssuesByCriterion,
  getServiceIssues,
  getOpenIssues,
  getIssue,
  createIssue,
  updateIssue,
  updateIssueData,
  getDepartmentIssues,
  getDepartmentOpenIssues,
  getAllIssues
}; 