const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Debug middleware
router.use((req, res, next) => {
    console.log('Auth route hit:', req.method, req.path);
    next();
});

// Sign in page
router.get('/sign-in', authController.showSignIn);

// Handle sign in form submission
router.post('/sign-in', authController.handleSignIn);

// Verify magic link token
router.get('/verify/:token', authController.verifyToken);

// Complete profile
router.post('/complete-profile', (req, res, next) => {
    console.log('Complete profile route hit');
    console.log('Request body:', req.body);
    authController.completeProfile(req, res, next);
});

// Sign out
router.get('/auth/sign-out', authController.signOut);

module.exports = router;