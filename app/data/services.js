const { db } = require('../db');
const businessAreasData = require('./business_areas');
const serviceRepositoriesData = require('./service_repositories');

/**
 * Get all services (for super admin)
 * @returns {Promise<Array>} Array of all services
 */
async function getAllServices() {
  return db('services')
    .select(
      'services.*', 
      'departments.name as department_name',
      db.raw('COUNT(DISTINCT issues.id) as open_issues_count'),
      'owner.first_name as owner_first_name',
      'owner.last_name as owner_last_name',
      'owner.email as owner_email',
      'business_areas.name as business_area_name'
    )
    .leftJoin('departments', 'services.department_id', 'departments.id')
    .leftJoin('users as owner', 'services.service_owner_id', 'owner.id')
    .leftJoin('business_areas', 'services.business_area_id', 'business_areas.id')
    .leftJoin('issues', function() {
      this.on('issues.service_id', '=', 'services.id')
          .andOn('issues.status', '<>', db.raw("'closed'"));
    })
    .groupBy(
      'services.id',
      'services.name',
      'services.url',
      'services.department_id',
      'services.service_owner_id',
      'services.external_id',
      'services.created_at',
      'services.updated_at',
      'services.statement_enrolled',
      'services.numeric_id',
      'services.business_area_id',
      'departments.name',
      'owner.first_name',
      'owner.last_name',
      'owner.email',
      'business_areas.name'
    )
    .orderBy('services.name');
}

/**
 * Get services for a specific department
 * @param {string} departmentId - Department ID (UUID)
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>} Array of services
 */
async function getDepartmentServices(departmentId, filters = {}) {
  let query = db('services')
    .select(
      'services.*', 
      'departments.name as department_name',
      db.raw('COUNT(DISTINCT issues.id) as open_issues_count'),
      'owner.first_name as owner_first_name',
      'owner.last_name as owner_last_name',
      'owner.email as owner_email',
      'business_areas.name as business_area_name'
    )
    .leftJoin('departments', 'services.department_id', 'departments.id')
    .leftJoin('users as owner', 'services.service_owner_id', 'owner.id')
    .leftJoin('business_areas', 'services.business_area_id', 'business_areas.id')
    .leftJoin('issues', function() {
      this.on('issues.service_id', '=', 'services.id')
          .andOn('issues.status', '<>', db.raw("'closed'"));
    })
    .where('services.department_id', departmentId);

  // Apply search filter
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.where(function() {
      this.whereRaw('LOWER(services.name) LIKE LOWER(?)', [searchTerm])
        .orWhereRaw('LOWER(services.url) LIKE LOWER(?)', [searchTerm])
        .orWhereRaw('LOWER(business_areas.name) LIKE LOWER(?)', [searchTerm]);
    });
  }

  // Apply business areas filter
  if (filters.business_areas && filters.business_areas.length > 0) {
    query = query.whereIn('services.business_area_id', filters.business_areas);
  }

  // Apply issues status filter
  if (filters.has_issues === 'true') {
    query = query.having(db.raw('COUNT(DISTINCT issues.id) > 0'));
  } else if (filters.no_issues === 'true') {
    query = query.having(db.raw('COUNT(DISTINCT issues.id) = 0'));
  }

  // Apply statement service status filter
  if (filters.enrolled === 'true') {
    query = query.where('services.statement_enrolled', true);
  } else if (filters.not_enrolled === 'true') {
    query = query.where('services.statement_enrolled', false);
  }

  return query
    .groupBy(
      'services.id',
      'services.name',
      'services.url',
      'services.department_id',
      'services.service_owner_id',
      'services.external_id',
      'services.created_at',
      'services.updated_at',
      'services.statement_enrolled',
      'services.numeric_id',
      'services.business_area_id',
      'departments.name',
      'owner.first_name',
      'owner.last_name',
      'owner.email',
      'business_areas.name'
    )
    .orderBy('services.name');
}

/**
 * Get services accessible to a specific user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Array>} Array of services
 */
async function getUserServices(userId) {
  return db('services')
    .select(
      'services.*', 
      'departments.name as department_name',
      db.raw('COUNT(DISTINCT issues.id) as open_issues_count'),
      'owner.first_name as owner_first_name',
      'owner.last_name as owner_last_name',
      'owner.email as owner_email',
      'business_areas.name as business_area_name'
    )
    .leftJoin('departments', 'services.department_id', 'departments.id')
    .leftJoin('users as owner', 'services.service_owner_id', 'owner.id')
    .leftJoin('business_areas', 'services.business_area_id', 'business_areas.id')
    .leftJoin('issues', function() {
      this.on('issues.service_id', '=', 'services.id')
          .andOn('issues.status', '<>', db.raw("'closed'"));
    })
    .leftJoin('user_services', 'services.id', 'user_services.service_id')
    .where('user_services.user_id', userId)
    .orWhere('services.department_id', function() {
      this.select('department_id')
        .from('users')
        .where('id', userId);
    })
    .groupBy(
      'services.id',
      'services.name',
      'services.url',
      'services.department_id',
      'services.service_owner_id',
      'services.external_id',
      'services.created_at',
      'services.updated_at',
      'services.statement_enrolled',
      'services.numeric_id',
      'services.business_area_id',
      'departments.name',
      'owner.first_name',
      'owner.last_name',
      'owner.email',
      'business_areas.name'
    )
    .orderBy('services.name');
}

/**
 * Get service statistics for all services
 * @returns {Promise<Object>} Service statistics
 */
async function getServicesStats() {
  const stats = await db('services')
    .select(
      db.raw('COUNT(*) as total_services')
    )
    .first();

  return {
    total: parseInt(stats.total_services),
    active: 0,
    inactive: 0
  };
}

/**
 * Get service statistics for a department
 * @param {string} departmentId - Department ID (UUID)
 * @returns {Promise<Object>} Service statistics
 */
async function getDepartmentServicesStats(departmentId) {
  const stats = await db('services')
    .select(
      db.raw('COUNT(*) as total_services')
    )
    .where('services.department_id', departmentId)
    .first();

  return {
    total: parseInt(stats.total_services),
    active: 0,
    inactive: 0
  };
}

/**
 * Get service statistics for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object>} Service statistics
 */
async function getUserServicesStats(userId) {
  const stats = await db('services')
    .select(
      db.raw('COUNT(*) as total_services')
    )
    .leftJoin('user_services', 'services.id', 'user_services.service_id')
    .where('user_services.user_id', userId)
    .orWhere('services.department_id', function() {
      this.select('department_id')
        .from('users')
        .where('id', userId);
    })
    .first();

  return {
    total: parseInt(stats.total_services),
    active: 0,
    inactive: 0
  };
}

/**
 * Create a new service
 * @param {Object} serviceData - Service data
 * @returns {Promise<Object>} Created service
 */
async function createService(serviceData) {
  const [service] = await db('services')
    .insert({
      name: serviceData.name,
      url: serviceData.url,
      department_id: serviceData.department_id,
      business_area_id: serviceData.business_area_id,
      created_at: serviceData.created_at,
      updated_at: serviceData.updated_at
    })
    .returning('*');

  return service;
}

/**
 * Log a service action
 * @param {number} serviceId - Service ID
 * @param {number} userId - User ID
 * @param {string} action - Action type
 * @param {Object} data - Action data
 * @returns {Promise<void>}
 */
async function logServiceAction(serviceId, userId, action, data) {
  await db('service_audit_logs').insert({
    service_id: serviceId,
    user_id: userId,
    action,
    data: JSON.stringify(data),
    created_at: new Date()
  });
}

/**
 * Get a service by its numeric ID
 * @param {number} numericId - Service numeric ID
 * @returns {Promise<Object>} Service object
 */
async function getServiceByNumericId(numericId) {
  const [service] = await db('services')
    .select(
      'services.*',
      'departments.name as department_name'
    )
    .leftJoin('departments', 'services.department_id', 'departments.id')
    .where('services.numeric_id', numericId);
  
  return service;
}

/**
 * Get a service by its ID
 * @param {string} id - Service ID (UUID)
 * @returns {Promise<Object>} Service object
 */
async function getService(id) {
  const [service] = await db('services')
    .select(
      'services.*',
      'departments.name as department_name',
      'owner.first_name as owner_first_name',
      'owner.last_name as owner_last_name',
      'owner.email as owner_email',
      'business_areas.name as business_area_name'
    )
    .leftJoin('departments', 'services.department_id', 'departments.id')
    .leftJoin('users as owner', 'services.service_owner_id', 'owner.id')
    .leftJoin('business_areas', 'services.business_area_id', 'business_areas.id')
    .where('services.id', id);
  
  if (service) {
    // Get repositories for the service
    service.repositories = await serviceRepositoriesData.getServiceRepositories(id);
  }
  
  return service;
}

/**
 * Get a service by its name
 * @param {string} name - Service name
 * @returns {Promise<Object>} Service object
 */
async function getServiceByName(name) {
  const [service] = await db('services')
    .select('*')
    .where('name', name);
  
  return service;
}

/**
 * Get a service by its URL
 * @param {string} url - Service URL
 * @returns {Promise<Object>} Service object
 */
async function getServiceByUrl(url) {
  const [service] = await db('services')
    .select('*')
    .where('url', url);
  
  return service;
}

/**
 * Update a service
 * @param {string} id - Service ID (UUID)
 * @param {Object} serviceData - Service data to update
 * @returns {Promise<Object>} Updated service
 */
async function updateService(id, serviceData) {
  const [service] = await db('services')
    .where('id', id)
    .update({
      ...serviceData,
      updated_at: new Date()
    })
    .returning('*');
  
  return service;
}

module.exports = {
  getAllServices,
  getDepartmentServices,
  getUserServices,
  getServicesStats,
  getDepartmentServicesStats,
  getUserServicesStats,
  createService,
  logServiceAction,
  getServiceByNumericId,
  getService,
  getServiceByName,
  getServiceByUrl,
  updateService
}; 