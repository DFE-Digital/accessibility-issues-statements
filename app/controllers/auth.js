const crypto = require('crypto');
const NotifyClient = require('notifications-node-client').NotifyClient;
const { db } = require('../db');
const authData = require('../data/auth');

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
  expiry.setMinutes(expiry.getMinutes() + 30); // 30 minute expiry

  await db('tokens').insert({
    email,
    token,
    expires_at: expiry,
    created_at: new Date()
  });
}

// Send magic link email via GOV.UK Notify
async function sendMagicLink(email, token) {
  const magicLink = `${process.env.BASE_URL}/auth/verify?token=${token}`;
  
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
    const token = generateToken();
    await storeToken(email, token);
    await sendMagicLink(email, token);
    
    res.render('auth/check-email', { email });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.render('auth/sign-in', {
      errors: [{ msg: 'There was a problem sending your sign-in link. Please try again.' }]
    });
  }
}

// Verify magic link token
async function verifyToken(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.redirect('/auth/sign-in');
  }

  try {
    const user = await authData.verifyToken(token);
    
    if (!user) {
      return res.redirect('/auth/sign-in');
    }

    // Set user in session
    req.session.user = {
      id: user.user_id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      last_login: user.last_login,
      department: {
        id: user.department_id,
        name: user.department_name
      }
    };

    //  if department_admin redirect to /dashboard/department_admin/index
    if (user.role === 'department_admin') {
      return res.redirect('/dashboard/department_admin/index');
    }

    if (user.role === 'super_admin') {
      return res.redirect('/dashboard/super_admin/index');
    }




    // Get return URL or default to dashboard
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;

    res.redirect(returnTo);
  } catch (error) {
    console.error('Token verification error:', error);
    
    // render error page
    res.render('error', {
      message: 'There was a problem verifying your sign-in link. Please try again.'
    });

    // if the user is not found, redirect to /auth/sign-in
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
  signOut,
  TEMPLATE_IDS
}; 