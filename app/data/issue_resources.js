const { db } = require('../db');

/**
 * Get all resources for an issue
 * @param {string} issueId - Issue ID (UUID)
 * @returns {Promise<Array>} Array of resources
 */
async function getIssueResources(issueId) {
  return db('issue_resources')
    .select(
      'issue_resources.*',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'issue_resources.created_by', 'users.id')
    .where('issue_id', issueId)
    .orderBy('created_at', 'desc');
}

/**
 * Create a new resource for an issue
 * @param {Object} resourceData - Resource data
 * @returns {Promise<Object>} Created resource
 */
async function createResource(resourceData) {
  const [resource] = await db('issue_resources')
    .insert({
      issue_id: resourceData.issue_id,
      department_id: resourceData.department_id,
      type: resourceData.type,
      value: resourceData.value,
      created_by: resourceData.created_by
    })
    .returning('*');
  return resource;
}

/**
 * Delete a resource
 * @param {string} resourceId - Resource ID (UUID)
 * @param {string} userId - User ID making the request (for authorization)
 * @returns {Promise<Object>} Deleted resource if successful, null if not found or not authorized
 */
async function deleteResource(resourceId, userId) {
  const resource = await db('issue_resources')
    .where('id', resourceId)
    .first();

  if (!resource) {
    return null;
  }

  // Only allow deletion by the creator
  if (resource.created_by !== userId) {
    return null;
  }

  await db('issue_resources')
    .where('id', resourceId)
    .delete();

  return resource;
}

module.exports = {
  getIssueResources,
  createResource,
  deleteResource
}; 