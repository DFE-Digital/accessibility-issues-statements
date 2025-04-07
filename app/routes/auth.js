const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Sign in page
router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in');
});

// Handle sign in form submission
router.post('/sign-in', authController.handleSignIn);

// Verify magic link token
router.get('/verify', authController.verifyToken);

module.exports = router; 