const { db } = require('../db');
const crypto = require('crypto');

const getApiKeys = async() => {
    return db('api_keys')
        .leftJoin('departments', 'api_keys.department_id', 'departments.id')
        .select('api_keys.*', 'departments.name as department_name');
}

const createApiKey = async(name, expires_at, department_id) => {
    const token = crypto.randomBytes(32).toString('hex');
    const [id] = await db('api_keys').insert({
        name,
        token,
        expires_at,
        department_id
    }).returning('id');
    return id;
}

const deleteApiKey = async(id) => {
    return db('api_keys').where({ id }).del();
}

/**
 * Show the API Key management page
 */
const index = async(req, res) => {
    try {
        const apiKeys = await getApiKeys();
        const departments = await db('departments').select('id', 'name').orderBy('name');
        res.render('super_admin/api-manager/index', {
            user: req.session.user,
            apiKeys,
            departments,
            csrfToken: req.csrfToken(),
            successMessage: req.query.success,
            errorMessage: req.query.error
        });
    } catch (error) {
        console.error('Error loading API Keys:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the API Keys',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Create a new API Key
 */
const createKey = async(req, res) => {
    try {
        const { name, expires_at, department_id } = req.body;
        await createApiKey(name, expires_at || null, department_id);
        res.redirect('/super-admin/api-manager?success=API Key created successfully');
    } catch (error) {
        console.error('Error creating API Key:', error);
        res.redirect('/super-admin/api-manager?error=There was a problem creating the API Key');
    }
};

/**
 * Delete an API Key
 */
const deleteKey = async(req, res) => {
    try {
        const { id } = req.params;
        await deleteApiKey(id);
        res.redirect('/super-admin/api-manager?success=API Key deleted successfully');
    } catch (error) {
        console.error('Error deleting API Key:', error);
        res.redirect('/super-admin/api-manager?error=There was a problem deleting the API Key');
    }
};

/**
 * Show API request logs
 */
const showLogs = async(req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const offset = (page - 1) * limit;

        const logsQuery = db('api_requests')
            .leftJoin('api_keys', 'api_requests.api_key_id', 'api_keys.id')
            .select(
                'api_keys.name as key_name',
                'api_requests.path',
                'api_requests.method',
                'api_requests.status',
                'api_requests.ip_address',
                'api_requests.created_at'
            )
            .orderBy('api_requests.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        const totalResult = await db('api_requests').count('id as total').first();
        const total = totalResult.total;

        const logs = await logsQuery;

        res.render('super_admin/api-manager/logs', {
            user: req.session.user,
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.error('Error loading API logs:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the API request logs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    index,
    createKey,
    deleteKey,
    showLogs
};