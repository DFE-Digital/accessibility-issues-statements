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
const apiRoutes = require('./app/routes/api');
const dateFilter = require('nunjucks-date-filter');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const govukMarkdown = require('govuk-markdown');
const Airtable = require('airtable');
const session = require('./app/config/session');
const csrf = require('csurf');
const { getNavigationItems } = require('./app/helpers/navigation');
const { removeFilter, findServiceName, formatDateFilter, findById } = require('./app/filters');
const { authenticateApiKey } = require('./app/middleware/api_auth.js');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

const base = new Airtable({ apiKey: process.env.airtableFeedbackKey }).base(process.env.airtableFeedbackBase);

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
app.use('/public', express.static('app/public'));
app.use(express.json());

// Parse URL-encoded bodies (as sent by HTML forms)
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


// Add updateQueryParams filter for pagination
nunjuckEnv.addFilter('updateQueryParams', function(url, params) {
    // Create a URL object using the current path
    const urlObj = new URL(url, 'http://localhost');
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            urlObj.searchParams.set(key, value);
        } else {
            urlObj.searchParams.delete(key);
        }
    });
    return urlObj.pathname + urlObj.search;
});

nunjuckEnv.addFilter('paginationUrl', function(filters, page) {
    const newFilters = {...filters, page };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(newFilters)) {
        if (key === 'limit') continue; // Don't include limit in pagination links for cleanliness
        if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
        } else if (value) {
            params.append(key, value);
        }
    }
    return `?${params.toString()}`;
});

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

app.locals.serviceName = 'Manage your service accessibility issues and statements';

// Add a route that serves the app/robots.txt file
app.get('/robots.txt', function(req, res) {
    res.sendFile(path.join(__dirname, 'app/robots.txt'));
});

// --- API Rate Limiting ---
// Apply rate limiting to all /api routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 250, // Limit each key to 250 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req, res) => {
        // Use the API key ID for rate limiting
        return req.apiKey ? req.apiKey.id : req.ip;
    },
    message: {
        error: 'Too many requests, please try again later.'
    },
});

// Separate API routes from web routes
app.use('/api', apiLimiter, apiRoutes);

// Web application routes - These use session-based authentication and CSRF
const webapp = express.Router();

// Set up session middleware
webapp.use(session);

// Set up CSRF protection
webapp.use(csrf({ cookie: false }));
webapp.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Authentication middleware
webapp.use((req, res, next) => {
    // List of public paths that don't require authentication
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

    // Check if the current path is public
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));

    // Allow access to public paths or if user is authenticated
    if (isPublicPath || req.session.user) {
        next();
    } else {
        // Store the requested URL to redirect back after login
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/sign-in');
    }
});

webapp.post('/form-response/feedback', (req, res) => {
    const { response } = req.body;

    // Prevent bots submitting empty feedback
    if (!response || response.trim() === '') {
        return res.status(400).json({ success: false, message: 'No feedback provided' });
    }

    // Prevent long feedback
    if (response.length > 400) {
        return res.status(400).json({ success: false, message: 'Feedback too long' });
    }

    console.log("Feedback received:", response);

    const service = res.locals.serviceName;
    const pageURL = req.headers.referer || 'Unknown'; // Capture the referrer URL

    base('Feedback').create([{
        fields: {
            Feedback: response,
            Service: service,
            URL: pageURL
        }
    }], function(err, records) {
        if (err) {
            console.error("Airtable Error:", err);
            return res.status(500).json({ success: false, message: 'Could not send feedback' });
        }

        res.json({ success: true, message: 'Thank you for your feedback' });
    });
});

// Use application routes
webapp.use('/', routes);

app.use('/', webapp);

// Clean URLs
app.get(/\.html?$/i, function(req, res) {
    let urlPath = req.path;
    const parts = urlPath.split('.');
    parts.pop();
    urlPath = parts.join('.');
    res.redirect(urlPath);
});

// Dynamic Route Matching for URLs without extensions
app.get(/^([^.]+)$/, function(req, res, next) {
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

    console.log(path);

    renderPath(path, res, next);
}

function renderPath(path, res, next) {
    // Try to render the path
    res.render(path, function(error, html) {
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
app.use(function(req, res, next) {
    res.status(404).render('404.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        originalMethod: req.originalMethod,
        path: req.path,
        body: req.body
    });

    // Handle CSRF token errors
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('error', {
            error: 'Invalid CSRF token',
            details: process.env.NODE_ENV === 'development' ? 'The form submission failed the CSRF validation. Please try again.' : undefined
        });
    }

    // Handle other errors
    res.status(500).render('error', {
        error: 'Something went wrong',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server
const PORT = process.env.PORT || 3411;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;