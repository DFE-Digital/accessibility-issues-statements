const { db } = require('../db');

const logApiRequest = async(apiKeyId, path, method, status, ipAddress) => {
    try {
        let cleanIpAddress = ipAddress;
        if (ipAddress === '::1') {
            cleanIpAddress = '127.0.0.1';
        } else if (ipAddress && ipAddress.startsWith('::ffff:')) {
            cleanIpAddress = ipAddress.substring(7);
            if (cleanIpAddress === '127.0.0.1') {
                cleanIpAddress = '127.0.0.1';
            }
        }

        await db('api_requests').insert({
            api_key_id: apiKeyId,
            path,
            method,
            status,
            ip_address: cleanIpAddress
        });
    } catch (error) {
        console.error('Error logging API request:', error);
    }
};

const authenticateApiKey = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

    if (!token) {
        await logApiRequest(null, req.originalUrl, req.method, 401, req.ip);
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const apiKey = await db('api_keys')
            .leftJoin('departments', 'api_keys.department_id', 'departments.id')
            .select('api_keys.*', 'departments.name as department_name')
            .where('api_keys.token', token)
            .first();

        if (!apiKey) {
            await logApiRequest(null, req.originalUrl, req.method, 401, req.ip);
            return res.status(401).json({ error: 'Invalid API key' });
        }

        if (!apiKey.department_id) {
            await logApiRequest(apiKey.id, req.originalUrl, req.method, 403, req.ip);
            return res.status(403).json({ error: 'This API key is not associated with a department and cannot be used.' });
        }

        const now = new Date();
        if (apiKey.expires_at && new Date(apiKey.expires_at) < now) {
            await logApiRequest(apiKey.id, req.originalUrl, req.method, 401, req.ip);
            return res.status(401).json({ error: 'API key has expired' });
        }

        req.apiKey = {
            id: apiKey.id,
            department: {
                id: apiKey.department_id,
                name: apiKey.department_name
            }
        };

        res.on('finish', () => {
            logApiRequest(apiKey.id, req.originalUrl, req.method, res.statusCode, req.ip);
        });

        next();
    } catch (error) {
        console.error('API authentication error:', error);
        await logApiRequest(null, req.originalUrl, req.method, 500, req.ip);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = {
    authenticateApiKey
};