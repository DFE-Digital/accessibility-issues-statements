const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

// Security middleware
const security = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  }),
  
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  authLimiter: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false
  })
};

// Validation middleware
const validation = {
  rules: {
    email: body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address')
      .normalizeEmail(),

    password: body('password')
      .trim()
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),

    feedback: body('response')
      .trim()
      .notEmpty().withMessage('Feedback is required')
      .isLength({ max: 400 }).withMessage('Feedback must be less than 400 characters')
  },

  validate: (validations) => {
    return async (req, res, next) => {
      await Promise.all(validations.map(validation => validation.run(req)));
      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      const errorMessages = errors.array().map(err => err.msg);
      throw new ValidationError(errorMessages.join(', '));
    };
  }
};

// Authentication middleware
const auth = {
  requireAuth: (req, res, next) => {
    const publicPaths = [
      '/auth/sign-in',
      '/auth/verify',
      '/auth/complete-profile',
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.ico',
      '/assets',
      '/govuk',
      '/dfe',
      '/s/'
    ];

    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));

    if (isPublicPath || req.session.user) {
      next();
    } else {
      req.session.returnTo = req.originalUrl;
      res.redirect('/auth/sign-in');
    }
  }
};

module.exports = {
  security,
  validation,
  auth
}; 