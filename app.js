require('dotenv').config();

// Debug database configuration
console.log('Database Configuration:');
console.log('Server:', process.env.DB_SERVER);
console.log('Database:', process.env.DB_NAME);
console.log('Encrypt:', process.env.DB_ENCRYPT);
console.log('Trust Server Certificate:', process.env.DB_TRUST_SERVER_CERTIFICATE);

const express = require('express');
const compression = require('compression');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const path = require('path');
const routes = require('./app/routes');
const dateFilter = require('nunjucks-date-filter');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const govukMarkdown = require('govuk-markdown');
const Airtable = require('airtable');
const session = require('./app/config/session');
const csrf = require('csurf');
const { getNavigationItems } = require('./app/helpers/navigation');
const { removeFilter, findServiceName, formatDateFilter, findById } = require('./app/filters');
const { security, validation, auth } = require('./app/middleware');
const { log, requestLogger } = require('./app/utils/logger');
const { errorHandler } = require('./app/utils/errorHandler');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

const base = new Airtable({ apiKey: process.env.airtableFeedbackKey }).base(process.env.airtableFeedbackBase);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGIN,
  methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Content-Type', 'Authorization'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10)
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // Default to 15 minutes if not set
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10), // Default to 500 if not set
  message: {
    status: 429,
    error: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true // Don't count successful requests against the limit
});
app.use(limiter);

// Request logging
app.use(requestLogger);

// Configure Nunjucks
const nunjuckEnv = nunjucks.configure([
  'app/views',
  'app/views/layouts',
  'node_modules/govuk-frontend/dist/',
  'node_modules/dfe-frontend/packages/components'
], {
  autoescape: true,
  express: app,
  watch: process.env.NODE_ENV === 'development',
  noCache: process.env.NODE_ENV === 'development'
});

app.use(compression());

// Serve static files
app.use('/govuk', express.static(path.join(__dirname, 'node_modules/govuk-frontend/govuk/assets')));
app.use('/dfe', express.static(path.join(__dirname, 'node_modules/dfe-frontend/dist')));
app.use('/assets', express.static('app/public'));
app.use(express.urlencoded({ extended: true }));

// Method override for PUT/DELETE methods
app.use(methodOverride('_method'));

app.use('/favicon.ico', express.static(path.join(__dirname, 'public/assets/images/favicon.ico')));

// Add date filter
nunjuckEnv.addFilter('date', dateFilter);

// Add custom filters
nunjuckEnv.addFilter('removeFilter', removeFilter);
nunjuckEnv.addFilter('findServiceName', findServiceName);
nunjuckEnv.addFilter('findById', findById);
nunjuckEnv.addFilter('formatDateFilter', formatDateFilter);

// Register marked and markdown libraries
marked.use(govukMarkdown({
  headingsStartWith: 'xl'
}));

markdown.register(nunjuckEnv, marked.parse);

// Set view engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'app/views'));

// Make request object available to all templates
app.use((req, res, next) => {
  res.locals.req = req;
  res.locals.env = process.env.NODE_ENV;
  next();
});

// Add a route that serves the app/robots.txt file
app.get('/robots.txt', function (req, res) {
  res.sendFile(path.join(__dirname, 'app/robots.txt'));
});

// Set up session middleware
app.use(session);

// Set up CSRF protection
app.use(csrf({ cookie: false }));
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Authentication middleware
app.use(auth.requireAuth);

// Add navigation items and DfE-specific variables to all responses
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.currentPath = req.path;
  res.locals.navigationItems = req.session.user ? getNavigationItems(req.session.user) : [];
  res.locals.serviceName = 'Accessibility Issues Management';
  res.locals.description = 'Manage and track accessibility issues across government services';
  res.locals.env = process.env.NODE_ENV;
  next();
});

// Update feedback route with validation
app.post('/form-response/feedback', validation.validate([validation.rules.feedback]), async (req, res) => {
  const { response } = req.body;
  const service = 'Design manual';
  const pageURL = req.headers.referer || 'Unknown';

  try {
    // Insert feedback into database using Knex
    await req.app.get('knex')('Feedback').insert({
      Feedback: response,
      Service: service,
      URL: pageURL,
      CreatedAt: new Date()
    });

    log.info('Feedback submitted successfully', {
      service,
      pageURL,
      feedbackLength: response.length
    });

    res.json({ success: true, message: 'Thank you for your feedback' });
  } catch (error) {
    log.error('Failed to submit feedback', {
      error: error.message,
      service,
      pageURL
    });
    
    throw error;
  }
});

// Use application routes
app.use('/', routes);

// Clean URLs
app.get(/\.html?$/i, function (req, res) {
  let urlPath = req.path;
  const parts = urlPath.split('.');
  parts.pop();
  urlPath = parts.join('.');
  res.redirect(urlPath);
});

// Dynamic Route Matching for URLs without extensions
app.get(/^([^.]+)$/, function (req, res, next) {
  matchRoutes(req, res, next);
});

// Render sitemap.xml in XML format
app.get('/sitemap.xml', (_, res) => {
  res.set({ 'Content-Type': 'application/xml' });
  res.render('sitemap.xml');
});

// Route matching function
function matchRoutes(req, res, next) {
  let path = req.path;

  // Remove the first slash, render won't work with it
  path = path.startsWith('/') ? path.slice(1) : path;

  // If it's blank, render the root index
  if (path === '') {
    path = 'index';
  }

  log.debug('Rendering path', { path });

  renderPath(path, res, next);
}

function renderPath(path, res, next) {
  // Try to render the path
  res.render(path, function (error, html) {
    if (!error) {
      // Success - send the response
      res.set({ 'Content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (!error.message.startsWith('template not found')) {
      // We got an error other than template not found - call next with the error
      next(error);
      return;
    }
    if (!path.endsWith('/index')) {
      // Maybe it's a folder - try to render [path]/index.html
      renderPath(path + '/index', res, next);
      return;
    }
    // We got template not found both times - call next to trigger the 404 page
    next();
  });
}

// Handle 404 errors
app.use(function (req, res, next) {
  res.status(404).render('404.html');
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3411;
app.listen(PORT, () => {
  log.info(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;