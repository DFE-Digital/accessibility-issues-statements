const express = require('express');
const router = express.Router();
const users = require('../controllers/users');

// List users
router.get('/', users.index);

// New user form
router.get('/new', users.showNewForm);

// Create user
router.post('/', users.create);

// Edit user form
router.get('/:id/edit', users.showEditForm);

// Update user
router.post('/:id', users.update);

// Delete user
router.post('/:id/delete', users.destroy);

module.exports = router; 