const { db } = require('../db');

/**
 * Get all WCAG criteria
 * @returns {Promise<Array>} Array of WCAG criteria
 */
async function getWcagCriteria() {
  return db('wcag_criteria')
    .select('*')
    .orderBy('criterion');
}

/**
 * Create a new WCAG criterion
 * @param {Object} data - WCAG criterion data
 * @returns {Promise<Object>} Created WCAG criterion
 */
async function createWcagCriterion(data) {
  const result = await db('wcag_criteria')
    .insert(data)
    .then(() => db.raw('SELECT SCOPE_IDENTITY() as id'))
    .then(result => result[0].id);
  
  return db('wcag_criteria').where({ id: result }).first();
}

/**
 * Update a WCAG criterion
 * @param {number} id - WCAG criterion ID
 * @param {Object} data - WCAG criterion data
 * @returns {Promise<Object>} Updated WCAG criterion
 */
async function updateWcagCriterion(id, data) {
  await db('wcag_criteria').where({ id }).update(data);
  return db('wcag_criteria').where({ id }).first();
}

/**
 * Delete a WCAG criterion
 * @param {number} id - WCAG criterion ID
 * @returns {Promise<void>}
 */
async function deleteWcagCriterion(id) {
  return db('wcag_criteria').where({ id }).del();
}

/**
 * Get WCAG criteria by criterion
 * @param {string} criterion - WCAG criterion
 * @returns {Promise<Object>} WCAG criterion
 */
async function getWcagCriteriaByCriterion(criterion) {
  return db('wcag_criteria').where({ criterion }).first();
} 

module.exports = {
  getWcagCriteria,
  createWcagCriterion,
  updateWcagCriterion,
  deleteWcagCriterion,
  getWcagCriteriaByCriterion
}; 