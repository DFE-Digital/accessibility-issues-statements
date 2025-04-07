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

module.exports = {
  getWcagCriteria
}; 