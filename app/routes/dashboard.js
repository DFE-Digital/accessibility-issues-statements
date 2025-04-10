const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, dashboardController.index);
router.get('/api/data', requireAuth, dashboardController.getDashboardData);

module.exports = router; 