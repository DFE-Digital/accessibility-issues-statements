const { db } = require('../db');

/**
 * Get all repositories for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of repositories
 */
async function getServiceRepositories(serviceId) {
  return db('service_repositories')
    .where('service_id', serviceId)
    .orderBy('created_at');
}

/**
 * Add a repository to a service
 * @param {Object} repositoryData - Repository data
 * @returns {Promise<Object>} Created repository
 */
async function addRepository(repositoryData) {
  const [repository] = await db('service_repositories')
    .insert({
      service_id: repositoryData.serviceId,
      url: repositoryData.url,
      type: repositoryData.type,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');

  return repository;
}

/**
 * Update a repository
 * @param {string} id - Repository ID
 * @param {Object} repositoryData - Repository data
 * @returns {Promise<Object>} Updated repository
 */
async function updateRepository(id, repositoryData) {
  const [repository] = await db('service_repositories')
    .where('id', id)
    .update({
      url: repositoryData.url,
      type: repositoryData.type,
      updated_at: db.fn.now()
    })
    .returning('*');

  return repository;
}

/**
 * Delete a repository
 * @param {string} id - Repository ID
 */
async function deleteRepository(id) {
  await db('service_repositories')
    .where('id', id)
    .del();
}

/**
 * Delete all repositories for a service
 * @param {string} serviceId - Service ID
 */
async function deleteServiceRepositories(serviceId) {
  await db('service_repositories')
    .where('service_id', serviceId)
    .del();
}

module.exports = {
  getServiceRepositories,
  addRepository,
  updateRepository,
  deleteRepository,
  deleteServiceRepositories
}; 