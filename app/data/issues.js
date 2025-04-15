const { db } = require('../db');
const cache = require('../utils/cache');

/**
 * Get all issues for a service
 * @param {string} serviceId - Service ID (UUID)
 * @returns {Promise<Array>} Array of issues
 */
async function getServiceIssues(serviceId) {
  const cacheKey = `service_issues:${serviceId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const issues = await db('issues')
    .select(
      'issues.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('issues.service_id', serviceId)
    .orderBy('issues.created_at', 'desc');

  // Batch fetch all WCAG criteria and types
  const issueIds = issues.map(issue => issue.id);
  
  const [criteria, types] = await Promise.all([
    db('issue_wcag_criteria')
      .select('issue_wcag_criteria.issue_id', 'wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .whereIn('issue_wcag_criteria.issue_id', issueIds),
    db('issue_types')
      .select('issue_id', 'type')
      .whereIn('issue_id', issueIds)
  ]);

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

  // Attach to issues
  const result = issues.map(issue => ({
    ...issue,
    wcag_criteria: criteriaByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || []
  }));

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get open issues for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of open issues
 */
async function getOpenIssues(serviceId) {
  const cacheKey = `open_issues:${serviceId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

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

  // Batch fetch all WCAG criteria and types
  const issueIds = issues.map(issue => issue.id);
  
  const [criteria, types] = await Promise.all([
    db('issue_wcag_criteria')
      .select('issue_wcag_criteria.issue_id', 'wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .whereIn('issue_wcag_criteria.issue_id', issueIds),
    db('issue_types')
      .select('issue_id', 'type')
      .whereIn('issue_id', issueIds)
  ]);

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

  // Attach to issues
  const result = issues.map(issue => ({
    ...issue,
    wcag_criteria: criteriaByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || []
  }));

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get a single issue by ID
 * @param {string} issueId - Issue ID (UUID)
 * @returns {Promise<Object>} Issue object
 */
async function getIssue(issueId) {
  const cacheKey = `issue:${issueId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Get all data in parallel
  const [issue, createdBy, service, assignedUser, criteria, types] = await Promise.all([
    db('issues').where('id', issueId).first(),
    db('users')
      .where('id', db('issues').select('created_by').where('id', issueId))
      .select(db.raw("CONCAT(first_name, ' ', last_name) as name"))
      .first(),
    db('services')
      .where('id', db('issues').select('service_id').where('id', issueId))
      .select('name', 'department_id')
      .first(),
    db('users')
      .where('id', db('issues').select('assigned_to').where('id', issueId))
      .select(
        db.raw("CONCAT(first_name, ' ', last_name) as name"),
        'email'
      )
      .first(),
    db('issue_wcag_criteria')
      .select('wcag_criteria.*')
      .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
      .where('issue_wcag_criteria.issue_id', issueId),
    db('issue_types')
      .select('type')
      .where('issue_id', issueId)
  ]);

  if (!issue) {
    return null;
  }

  // Combine all the data
  const result = {
    ...issue,
    created_by_name: createdBy?.name || null,
    service_name: service?.name || null,
    department_id: service?.department_id || null,
    assigned_to_name: assignedUser?.name || null,
    assigned_to_email: assignedUser?.email || null,
    wcag_criteria: criteria || [],
    types: types.map(t => t.type)
  };

  cache.set(cacheKey, result);
  return result;
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
 * @param {string} id - Issue ID
 * @param {Object} data - Issue data to update
 * @returns {Promise<void>}
 */
async function updateIssue(id, data) {
  const trx = await db.transaction();
  try {
    await trx('issues')
      .where('id', id)
      .update(data);
    
    await trx.commit();
    
    // Clear relevant caches
    cache.del(`issue:${id}`);
    const issue = await trx('issues').where('id', id).first();
    if (issue) {
      cache.del(`service_issues:${issue.service_id}`);
      cache.del(`open_issues:${issue.service_id}`);
      const service = await trx('services').where('id', issue.service_id).first();
      if (service) {
        cache.del(`department_issues:${service.department_id}`);
      }
    }
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
 * Get all issues for a department
 * @param {number} departmentId - Department ID
 * @returns {Promise<Array>} Array of issues
 */
async function getDepartmentIssues(departmentId) {
  const cacheKey = `department_issues:${departmentId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Get all services for the department
  const services = await db('services')
    .select('id')
    .where('department_id', departmentId);
  
  const serviceIds = services.map(service => service.id);

  if (serviceIds.length === 0) {
    return [];
  }

  // Get all issues for the services
  const issues = await db('issues')
    .select(
      'issues.*',
      'services.name as service_name',
      'services.url as service_url',
      db.raw("CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name"),
      db.raw("CONCAT(assignee.first_name, ' ', assignee.last_name) as assigned_to_name")
    )
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('users as creator', 'issues.created_by', 'creator.id')
    .leftJoin('users as assignee', 'issues.assigned_to', 'assignee.id')
    .whereIn('issues.service_id', serviceIds)
    .orderBy('issues.created_at', 'desc');

  // Batch fetch all WCAG criteria and types
  const issueIds = issues.map(issue => issue.id);
  
  const [wcagCriteria, types] = await Promise.all([
    db('issue_wcag_criteria')
      .select('issue_id', 'wcag_criterion')
      .whereIn('issue_id', issueIds),
    db('issue_types')
      .select('issue_id', 'type')
      .whereIn('issue_id', issueIds)
  ]);

  // Group WCAG criteria and types by issue_id
  const wcagByIssue = wcagCriteria.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.wcag_criterion);
    return acc;
  }, {});

  const typesByIssue = types.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.type);
    return acc;
  }, {});

  // Attach WCAG criteria and types to issues
  const result = issues.map(issue => ({
    ...issue,
    wcag_criteria: wcagByIssue[issue.id] || [],
    types: typesByIssue[issue.id] || []
  }));

  cache.set(cacheKey, result);
  return result;
}

// Get all open issues for a department
async function getDepartmentOpenIssues(departmentId) {
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

    // Get issue types - ensure we're getting all types regardless of status
    const types = await db('issue_types')
      .select('type')
      .where('issue_id', issue.id);
    
    issue.types = types.map(t => t.type);
  }

  return issues;
}

/**
 * Get issues by WCAG criterion
 * @param {string} criterion - WCAG criterion
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesByCriterion(criterion) {
  const cacheKey = `issues_by_criterion:${criterion}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const issues = await db('issue_wcag_criteria')
    .select(
      'issues.*',
      'wcag_criteria.criterion',
      'wcag_criteria.title as wcag_title',
      'wcag_criteria.level',
      'services.name as service_name',
      'services.url as service_url',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
    .leftJoin('wcag_criteria', 'issue_wcag_criteria.wcag_criterion', 'wcag_criteria.criterion')
    .leftJoin('services', 'issues.service_id', 'services.id')
    .leftJoin('users', 'issues.created_by', 'users.id')
    .where('issue_wcag_criteria.wcag_criterion', criterion)
    .orderBy('issues.created_at', 'desc');

  // Batch fetch all types
  const issueIds = issues.map(issue => issue.id);
  const types = await db('issue_types')
    .select('issue_id', 'type')
    .whereIn('issue_id', issueIds);

  // Group types by issue_id
  const typesByIssue = types.reduce((acc, curr) => {
    if (!acc[curr.issue_id]) acc[curr.issue_id] = [];
    acc[curr.issue_id].push(curr.type);
    return acc;
  }, {});

  // Attach types to issues
  const result = issues.map(issue => ({
    ...issue,
    types: typesByIssue[issue.id] || []
  }));

  cache.set(cacheKey, result);
  return result;
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