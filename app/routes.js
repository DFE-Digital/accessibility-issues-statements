const express = require('express');
const router = express.Router();
const { isAuthenticated, isDepartmentAdmin, isSuperAdmin } = require('./middleware/auth');

// Import controllers
const homeController = require('./controllers/home');
const dashboardController = require('./controllers/dashboard');
const servicesController = require('./controllers/services');
const issuesController = require('./controllers/issues');
const statementController = require('./controllers/statement');
const statementTemplatesController = require('./controllers/statement_templates');
const serviceSettingsController = require('./controllers/service_settings');
const serviceStatementController = require('./controllers/service_statement');
const reportingController = require('./controllers/reporting');
const usersController = require('./controllers/users');
const departmentAdminController = require('./controllers/department_admin');
const userServicesController = require('./controllers/user_services');
const userServiceAssignmentsController = require('./controllers/user_service_assignments');
const supportController = require('./controllers/support');
const departmentsController = require('./controllers/departments');
const reportsController = require('./controllers/reports');
const businessAreasController = require('./controllers/business_areas');
const wcagCriteriaController = require('./controllers/wcag_criteria');

// Import route modules
const authRoutes = require('./routes/auth');

// Auth routes
router.use('/auth', authRoutes);

// Public routes
router.get('/', homeController.g_home);

// Protected routes
router.get('/dashboard', isAuthenticated, dashboardController.index);

// Services routes
router.get('/services', isAuthenticated, servicesController.index);
router.get('/services/new', isDepartmentAdmin, servicesController.newService);
router.post('/services', isDepartmentAdmin, servicesController.createService);
router.get('/services/:id', isAuthenticated, servicesController.showService);
router.get('/services/:id/edit', isAuthenticated, servicesController.editService);
router.post('/services/:id', isDepartmentAdmin, servicesController.updateService);

// Issue routes
router.get('/services/:serviceId/issues', isAuthenticated, servicesController.showServiceIssues);
router.get('/services/:serviceId/issues/new', isAuthenticated, issuesController.showNewIssueForm);
router.post('/services/:serviceId/issues', isAuthenticated, issuesController.handleCreateIssue);
router.get('/services/:serviceId/issues/:id', isAuthenticated, issuesController.showIssueDetails);
router.get('/services/:serviceId/issues/:id/edit', isAuthenticated, issuesController.showEditIssueForm);
router.post('/services/:serviceId/issues/:id', isAuthenticated, issuesController.handleUpdateIssue);

// Issue comments
router.post('/services/:serviceId/issues/:id/comments', isAuthenticated, issuesController.addComment);
router.post('/services/:serviceId/issues/:id/comments/:commentId/delete', isAuthenticated, issuesController.handleDeleteComment);

// Issue status changes
router.post('/services/:serviceId/issues/:id/close', isAuthenticated, issuesController.handleCloseIssue);
router.post('/services/:serviceId/issues/:id/reopen', isAuthenticated, issuesController.handleReopenIssue);
router.post('/services/:serviceId/issues/:id/assign', isAuthenticated, issuesController.assignIssue);

// Statement routes
router.get('/services/:serviceId/statement', isAuthenticated, statementController.showStatementIndex);
router.get('/s/:numericId', statementController.showPublicStatement);

// Statement template routes (super admin only)
router.get('/super-admin/statement-templates', isAuthenticated, statementTemplatesController.showTemplateIndex);
router.get('/super-admin/statement-templates/new', isAuthenticated, statementTemplatesController.showNewTemplate);
router.post('/super-admin/statement-templates', isAuthenticated, statementTemplatesController.createTemplate);
router.get('/super-admin/statement-templates/:id/edit', isAuthenticated, statementTemplatesController.showEditTemplate);
router.put('/super-admin/statement-templates/:id', isAuthenticated, statementTemplatesController.updateTemplateHandler);
router.post('/super-admin/statement-templates/:id', isAuthenticated, statementTemplatesController.updateTemplateHandler);

// Service settings routes
router.get('/services/:serviceId/settings', isAuthenticated, serviceSettingsController.showServiceSettings);

// Response time settings
router.get('/services/:serviceId/settings/response-time', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showResponseTime);
router.post('/services/:serviceId/settings/response-time', isAuthenticated, isDepartmentAdmin, serviceSettingsController.updateResponseTime);

// Complaint contact settings
router.get('/services/:serviceId/settings/complaint-contact', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showComplaintContact);
router.post('/services/:serviceId/settings/complaint-contact', isAuthenticated, isDepartmentAdmin, serviceSettingsController.updateComplaintContact);

// Audit settings
router.get('/services/:serviceId/settings/audit', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showAudit);
router.post('/services/:serviceId/settings/audit', isAuthenticated, isDepartmentAdmin, serviceSettingsController.updateAudit);

// Contact methods settings
router.get('/services/:serviceId/settings/contact-methods/new', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showAddContactMethod);
router.post('/services/:serviceId/settings/contact-methods', isAuthenticated, isDepartmentAdmin, serviceSettingsController.createContactMethod);
router.get('/services/:serviceId/settings/contact-methods/:methodId/edit', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showEditContactMethod);
router.post('/services/:serviceId/settings/contact-methods/:methodId', isAuthenticated, isDepartmentAdmin, serviceSettingsController.updateContactMethod);
router.get('/services/:serviceId/settings/contact-methods/:methodId/delete', isAuthenticated, isDepartmentAdmin, serviceSettingsController.showDeleteContactMethod);
router.post('/services/:serviceId/settings/contact-methods/:methodId/delete', isAuthenticated, isDepartmentAdmin, serviceSettingsController.deleteContactMethod);

// Service statement routes
router.get('/services/:serviceId/statement', serviceStatementController.show);
router.post('/services/:serviceId/validate-url', serviceStatementController.validateServiceUrl);

// Reporting routes
router.get('/services/:serviceId/reporting', isAuthenticated, reportingController.showWcagHeatmap);

// Settings routes
router.get('/settings', isDepartmentAdmin, isAuthenticated, departmentAdminController.showSettings);
router.get('/settings/business-areas', isDepartmentAdmin, isAuthenticated, departmentAdminController.showBusinessAreas);
router.post('/settings', isAuthenticated, isDepartmentAdmin, departmentAdminController.updateSettings);

// Department admin routes
router.get('/department-admin', isAuthenticated, isDepartmentAdmin, departmentAdminController.index);
router.get('/department-admin/services', isAuthenticated, isDepartmentAdmin, departmentAdminController.showServices);
router.get('/department-admin/services/:serviceId', isAuthenticated, isDepartmentAdmin, departmentAdminController.showService);

// User management routes (department level)
router.get('/users', isAuthenticated, isDepartmentAdmin, usersController.index);
router.get('/department-admin/users/new', isAuthenticated, isDepartmentAdmin, usersController.showNewForm);
router.post('/department-admin/users', isAuthenticated, isDepartmentAdmin, usersController.create);
router.get('/department-admin/users/:id/edit', isAuthenticated, isDepartmentAdmin, usersController.showEditForm);
router.post('/department-admin/users/:id', isAuthenticated, isDepartmentAdmin, usersController.update);
router.post('/department-admin/users/:id/delete', isAuthenticated, isDepartmentAdmin, usersController.destroy);

// User service assignment routes
router.get('/department-admin/users/:userId/services', isAuthenticated, isDepartmentAdmin, userServiceAssignmentsController.index);
router.post('/department-admin/users/:userId/services', isAuthenticated, isDepartmentAdmin, userServiceAssignmentsController.update);

// User services routes
router.get('/services/user', isAuthenticated, userServicesController.index);
router.get('/services/user/:serviceId', isAuthenticated, userServicesController.showService);

// Department management routes (super admin only)
router.get('/departments', isAuthenticated, isSuperAdmin, departmentsController.index);
router.get('/departments/new', isAuthenticated, isSuperAdmin, departmentsController.showNewForm);
router.post('/departments', isAuthenticated, isSuperAdmin, departmentsController.create);
router.get('/departments/:id/edit', isAuthenticated, isSuperAdmin, departmentsController.showEditForm);
router.post('/departments/:id', isAuthenticated, isSuperAdmin, departmentsController.update);
router.post('/departments/:id/delete', isAuthenticated, isSuperAdmin, departmentsController.remove);

// Department admin management routes
router.get('/departments/:id/admins/new', isAuthenticated, isSuperAdmin, departmentsController.showNewAdminForm);
router.post('/departments/:id/admins', isAuthenticated, isSuperAdmin, departmentsController.addAdmin);
router.post('/departments/:id/admins/:adminId/remove', isAuthenticated, isSuperAdmin, departmentsController.removeAdmin);

// Support routes
router.get('/support', isAuthenticated, supportController.index);

// Reports routes
router.get('/reports', isAuthenticated, isDepartmentAdmin, reportsController.index);
router.get('/reports/wcag/:criterion', isAuthenticated, isDepartmentAdmin, reportsController.showWcagCriterion);

router.get('/issues', isAuthenticated, isDepartmentAdmin, issuesController.index);
router.get('/issues/:criterion', isAuthenticated, isDepartmentAdmin, issuesController.issuesByCriterion);

// Business areas routes
router.get('/department-admin/business-areas', isAuthenticated, isDepartmentAdmin, businessAreasController.index);
router.get('/department-admin/business-areas/new', isAuthenticated, isDepartmentAdmin, businessAreasController.showNewForm);
router.post('/department-admin/business-areas', isAuthenticated, isDepartmentAdmin, businessAreasController.create);
router.get('/department-admin/business-areas/:id/edit', isAuthenticated, isDepartmentAdmin, businessAreasController.showEditForm);
router.post('/department-admin/business-areas/:id', isAuthenticated, isDepartmentAdmin, businessAreasController.update);
router.post('/department-admin/business-areas/:id/delete', isAuthenticated, isDepartmentAdmin, businessAreasController.destroy);

// WCAG criteria management routes (super admin only)
router.get('/super-admin/wcag', isAuthenticated, isSuperAdmin, wcagCriteriaController.index);
router.get('/super-admin/wcag/new', isAuthenticated, isSuperAdmin, wcagCriteriaController.showNewForm);
router.post('/super-admin/wcag', isAuthenticated, isSuperAdmin, wcagCriteriaController.create);
router.get('/super-admin/wcag/:id/edit', isAuthenticated, isSuperAdmin, wcagCriteriaController.showEditForm);
router.post('/super-admin/wcag/:id', isAuthenticated, isSuperAdmin, wcagCriteriaController.update);
router.post('/super-admin/wcag/:id/delete', isAuthenticated, isSuperAdmin, wcagCriteriaController.destroy);

module.exports = router; 