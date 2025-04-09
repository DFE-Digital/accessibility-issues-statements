const express = require('express');
const router = express.Router();
const { 
  index, 
  newService, 
  createService,
  showService,
  editService,
  updateService,
  assignIssue
} = require('../controllers/services');
const { 
  showNewIssueForm,
  handleCreateIssue,
  showIssueDetails,
  showEditIssueForm,
  handleUpdateIssue,
  addComment,
  assignIssue
} = require('../controllers/issues');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/sign-in');
  }
  next();
};

// Middleware to check if user is department admin or super admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || (req.session.user.role !== 'department_admin' && req.session.user.role !== 'super_admin')) {
    return res.status(403).render('error', {
      error: 'You do not have permission to access this resource'
    });
  }
  next();
};

// Get services list
router.get('/', isAuthenticated, index);

// Show new service form
router.get('/new', isAdmin, newService);

// Create new service
router.post('/', isAdmin, createService);

// Show service details
router.get('/:id', isAuthenticated, showService);

// Show edit service form
router.get('/:id/edit', isAdmin, editService);

// Update service
router.post('/:id', isAdmin, updateService);

// Issue routes
router.get('/:serviceId/issues/new', isAdmin, showNewIssueForm);
router.post('/:serviceId/issues', isAdmin, handleCreateIssue);
router.get('/:serviceId/issues/:id', isAuthenticated, showIssueDetails);
router.get('/:serviceId/issues/:id/edit', isAdmin, showEditIssueForm);
router.post('/:serviceId/issues/:id', isAdmin, handleUpdateIssue);

// Issue comments
router.post('/:serviceId/issues/:id/comments', 
  isAuthenticated,
  addComment
);

// Issue assignment
router.post('/:serviceId/issues/:issueId/assign', isAuthenticated, assignIssue);

module.exports = router; 