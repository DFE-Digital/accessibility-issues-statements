const axios = require('axios');
const { getService } = require('../data/services');
const { getServiceStatementSettings } = require('../data/service_statement_settings');
const { db } = require('../db');

async function show(req, res) {
    try {
        const service = await getService(req.params.serviceId);
        const settings = await getServiceStatementSettings(service.id);

        if (!service) {
            return res.status(404).render('error', { message: 'Service not found' });
        }

        // Check if user can enroll the service
        const ableToEnroll = settings &&
            settings.response_time_sla &&
            settings.complaint_contact &&
            settings.last_audit_date &&
            settings.last_audit_by &&
            settings.last_audit_method;

        // Generate the statement URL
        const statementUrl = `${req.protocol}://${req.get('host')}/s/${service.numeric_id}`;

        res.render('services/department_admin/statement/index', {
            service,
            settings,
            ableToEnroll,
            statementUrl,
            baseUrl: req.protocol + '://' + req.get('host'),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing service statement:', error);
        res.status(500).render('error', { message: 'Error loading service statement' });
    }
}

async function validateServiceUrl(req, res) {
    try {
        const service = await getService(req.params.serviceId);

        if (!service || !service.url) {
            return res.status(400).json({ success: false, message: 'Service URL not found' });
        }

        // Get the service's URL content
        const response = await axios.get(service.url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Accessibility Issues Management; +https://github.com/your-repo)'
            }
        });
        const html = response.data;

        // Get the statement URL in different formats
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const statementUrl = `${baseUrl}/s/${service.numeric_id}`;

        // Create different variations of the URL to check for
        const urlVariations = [
            statementUrl, // Full URL
            statementUrl.replace('https://', 'http://'), // HTTP version
            statementUrl.replace(/^https?:\/\//, ''), // Without protocol
            statementUrl.replace(/^https?:\/\//, '//'), // Protocol-relative
            encodeURI(statementUrl), // URL encoded
            encodeURIComponent(statementUrl) // Full URL encoded
        ];

        // Check if any variation of the URL exists in the page
        const hasStatementLink = urlVariations.some(url => html.includes(url));

        if (hasStatementLink) {
            // Update service enrolled status directly in the database
            await db('services')
                .where('id', service.id)
                .update({
                    statement_enrolled: true,
                    updated_at: db.fn.now()
                });

            return res.json({ success: true });
        } else {
            return res.json({
                success: false,
                message: 'Statement URL not found on the service page',
                expectedUrl: statementUrl,
                variations: urlVariations
            });
        }
    } catch (error) {
        console.error('Error validating service URL:', error);

        if (error.code === 'ECONNABORTED') {
            return res.status(500).json({
                success: false,
                message: 'Connection to service URL timed out'
            });
        }

        if (error.response) {
            return res.status(500).json({
                success: false,
                message: `Service returned status code ${error.response.status}`
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error validating service URL',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    show,
    validateServiceUrl
};