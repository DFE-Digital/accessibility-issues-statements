const crypto = require('crypto');
const NotifyClient = require('notifications-node-client').NotifyClient;
const { db } = require('../db');
const authData = require('../data/auth');
const jwt = require('jsonwebtoken');

const notifyClient = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY);

// Template IDs for different notification types
const TEMPLATE_IDS = {
  MAGIC_LINK: process.env.GOVUK_NOTIFY_MAGIC_LINK_TEMPLATE_ID,
  ISSUE_REPORTED: process.env.GOVUK_NOTIFY_ISSUE_REPORTED_TEMPLATE_ID,
  ISSUE_CLOSED: process.env.GOVUK_NOTIFY_ISSUE_CLOSED_TEMPLATE_ID
};

// Show sign-in form
function showSignIn(req, res) {
  res.render('auth/sign-in', {
    csrfToken: req.csrfToken()
  });
}

// Generate a secure token for magic link
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store token in database with email and expiry
async function storeToken(email, token) {
  const expiry = new Date();
  expiry.setUTCMinutes(expiry.getUTCMinutes() + 30); // 30 minute expiry in UTC

  await db('tokens').insert({
    email,
    token,
    expires_at: expiry,
    created_at: new Date()
  });
}

// Send magic link email via GOV.UK Notify
async function sendMagicLink(email, token) {
  const magicLink = `${process.env.BASE_URL}/auth/verify/${token}?email=${encodeURIComponent(email)}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=== Magic Link for Testing ===');
    console.log(`Email: ${email}`);
    console.log(`Magic Link: ${magicLink}`);
    console.log('==========================\n');
  } else {
    await notifyClient.sendEmail(
      TEMPLATE_IDS.MAGIC_LINK,
      email,
      {
        personalisation: {
          magic_link: magicLink
        }
      }
    );
  }
}

// Handle sign-in form submission
async function handleSignIn(req, res) {
  const { email } = req.body;
  
  if (!email) {
    return res.render('auth/sign-in', {
      errors: [{ msg: 'Please enter your email address' }]
    });
  }

  try {
    // Check if user exists
    const user = await db('users')
      .select('*')
      .where('email', email)
      .first();

    if (!user) {
      // Extract domain from email
      const domain = email.split('@')[1];
      
      // Check if domain exists in department_allowed_domains
      const allowedDomain = await db('department_allowed_domains')
        .select('department_id')
        .where('domain', '@'+domain)
        .first();

      if (!allowedDomain) {
        return res.render('auth/sign-in', {
          errors: [{ msg: 'Cannot sign in - contact the DfE DesignOps team for help' }]
        });
      }

      // Create new user
      const [newUser] = await db('users')
        .insert({
          email,
          role: 'user',
          department_id: allowedDomain.department_id,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Generate and send magic link for new user
      const token = generateToken();
      await storeToken(email, token);
      await sendMagicLink(email, token);
      
      return res.render('auth/check-email', { email });
    }

    // Existing user - generate and send magic link
    const token = generateToken();
    await storeToken(email, token);
    await sendMagicLink(email, token);
    
    res.render('auth/check-email', { email });
  } catch (error) {
    console.error('Error handling sign in:', error);
    res.render('auth/sign-in', {
      errors: [{ msg: 'There was a problem sending your sign-in link. Please try again.' }]
    });
  }
}

// Verify magic link token
async function verifyToken(req, res) {
  const { token } = req.params;
  const email = decodeURIComponent(req.query.email);

  console.log('verifyToken called with:', { token, email });

  if (!token) {
    console.log('No token provided');
    return res.status(400).render('auth/error', {
      error: 'Invalid or missing token'
    });
  }

  try {
    // Get the stored token
    const storedToken = await db('tokens')
      .where({ token, email })
      .first();

    console.log('Stored token:', storedToken);
    console.log('Current time:', new Date());
    console.log('Token expiry:', storedToken.expires_at);

    if (!storedToken) {
      console.log('Token not found');
      return res.status(400).render('auth/error', {
        error: 'Token not found or expired'
      });
    }

    // Check if token is expired using UTC
    const now = new Date();
    if (storedToken.expires_at < now) {
      console.log('Token expired');
      await db('tokens').where({ token }).del();
      return res.status(400).render('auth/error', {
        error: 'Token has expired'
      });
    }

    // Get the user with department information
    const user = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.role',
        'users.created_at',
        'users.updated_at',
        'users.department_id',
        'departments.name as department_name'
      )
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .where('users.email', email)
      .first();

    console.log('User found:', user);

    if (!user) {
      console.log('User not found');
      return res.status(400).render('auth/error', {
        error: 'User not found'
      });
    }

    // Check if user needs to complete their profile
    if (!user.first_name || !user.last_name) {
      console.log('User needs to complete profile');
      return res.render('auth/complete-profile', {
        csrfToken: req.csrfToken(),
        email: user.email
      });
    }

    // Create session with properly structured user data
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: {
        id: user.department_id,
        name: user.department_name
      },
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    req.session.isAuthenticated = true;

    console.log('Session set up:', req.session.user);

    // Delete the used token
    await db('tokens').where({ token }).del();

    // Save the session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).render('auth/error', {
          error: 'An error occurred during verification'
        });
      }
      console.log('Session saved, redirecting to dashboard');
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).render('auth/error', {
      error: 'An error occurred during verification'
    });
  }
}

// Add new function to handle profile completion
async function completeProfile(req, res) {
  console.log('completeProfile called with body:', req.body);
  const { first_name, last_name, email } = req.body;
  const errors = [];

  // Validate email is present
  if (!email) {
    return res.status(400).render('auth/error', {
      error: 'Email is required'
    });
  }

  // Validate first name
  if (!first_name || !first_name.trim()) {
    errors.push({
      msg: 'Enter your first name',
      param: 'first_name'
    });
  }

  // Validate last name
  if (!last_name || !last_name.trim()) {
    errors.push({
      msg: 'Enter your last name',
      param: 'last_name'
    });
  }

  // If there are errors, render the form again with errors
  if (errors.length > 0) {
    return res.render('auth/complete-profile', {
      csrfToken: req.csrfToken(),
      email,
      first_name: first_name || '',
      last_name: last_name || '',
      errors
    });
  }

  try {
    // Update user profile
    await db('users')
      .where({ email })
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        updated_at: new Date()
      });

    // Get the complete user data including department
    const user = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.role',
        'users.created_at',
        'users.updated_at',
        'departments.id as department_id',
        'departments.name as department_name'
      )
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .where('users.email', email)
      .first();

    if (!user) {
      return res.status(400).render('auth/error', {
        error: 'User not found'
      });
    }

    // Set up session with all required user data
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: {
        id: user.department_id,
        name: user.department_name
      },
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    req.session.isAuthenticated = true;

    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).render('auth/error', {
      error: 'There was a problem completing your profile'
    });
  }
}

// Handle user sign out
function signOut(req, res) {
  // Clear the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    // Redirect to sign in page
    res.redirect('/auth/sign-in');
  });
}

module.exports = {
  showSignIn,
  handleSignIn,
  verifyToken,
  completeProfile,
  signOut,
  TEMPLATE_IDS
}; 