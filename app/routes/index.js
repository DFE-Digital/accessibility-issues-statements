const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const dashboardController = require('../controllers/dashboard');
const servicesRouter = require('./services');

// Auth routes
router.get('/auth/sign-in', authController.showSignIn);
router.post('/auth/sign-in', authController.handleSignIn);
router.get('/auth/verify', authController.verifyToken);
router.get('/auth/sign-out', authController.signOut);

// Dashboard route
router.get('/', dashboardController.index);

// Services routes
router.use('/services', servicesRouter);

// Home route
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/sign-in');
  }
});

module.exports = router; 