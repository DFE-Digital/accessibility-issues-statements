const { db } = require('../db');

/**
 * Get all business areas for a department
 * @param {string} departmentId - Department ID
 * @returns {Promise<Array>} Array of business areas
 */
async function getDepartmentBusinessAreas(departmentId) {
  return db('business_areas')
    .where('department_id', departmentId)
    .orderBy('name');
}

/**
 * Get a business area by ID
 * @param {string} id - Business area ID
 * @returns {Promise<Object>} Business area object
 */
async function getBusinessArea(id) {
  return db('business_areas')
    .where('id', id)
    .first();
}

/**
 * Create a new business area
 * @param {Object} businessAreaData - Business area data
 * @returns {Promise<Object>} Created business area
 */
async function createBusinessArea(businessAreaData) {
  const [businessArea] = await db('business_areas')
    .insert({
      name: businessAreaData.name,
      department_id: businessAreaData.departmentId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .returning('*');

  return businessArea;
}

/**
 * Update a business area
 * @param {string} id - Business area ID
 * @param {Object} businessAreaData - Business area data
 * @returns {Promise<Object>} Updated business area
 */
async function updateBusinessArea(id, businessAreaData) {
  const [businessArea] = await db('business_areas')
    .where('id', id)
    .update({
      name: businessAreaData.name,
      updated_at: db.fn.now()
    })
    .returning('*');

  return businessArea;
}

/**
 * Delete a business area
 * @param {string} id - Business area ID
 */
async function deleteBusinessArea(id) {
  await db('business_areas')
    .where('id', id)
    .del();
}

module.exports = {
  getDepartmentBusinessAreas,
  getBusinessArea,
  createBusinessArea,
  updateBusinessArea,
  deleteBusinessArea
}; 