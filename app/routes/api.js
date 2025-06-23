const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middleware/api_auth');
const { db } = require('../db');

// All routes in this file are protected by the API key
router.use(authenticateApiKey);

// GET /api/v1/services
router.get('/v1/services', async(req, res) => {
    try {
        const { department } = req.apiKey;
        let { page = 1, limit = 25, name, id, rosid, cmdbid } = req.query;
        const fetchAll = limit === 'all';

        const query = db('services').where({ 'services.department_id': department.id });
        const countQuery = db('services').where({ 'services.department_id': department.id }).count('id as total');

        if (name) {
            query.where('name', 'like', `%${name}%`);
            countQuery.where('name', 'like', `%${name}%`);
        }

        if (id) {
            query.where({ id });
            countQuery.where({ id });
        }

        if (rosid) {
            query.where({ rosid });
            countQuery.where({ rosid });
        }

        if (cmdbid) {
            query.where({ cmdbid });
            countQuery.where({ cmdbid });
        }

        const result = await countQuery.first();
        const total = result ? result.total : 0;

        if (fetchAll) {
            page = 1;
            limit = total;
        }
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const services = await query.select(
            'id',
            'name',
            'url',
            'created_at',
            'updated_at'
        ).limit(parseInt(limit, 10)).offset(offset);

        res.json({
            department: req.apiKey.department,
            data: services,
            pagination: {
                total: parseInt(total),
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/v1/services/list
router.get('/v1/services/list', async(req, res) => {
    try {
        const { department } = req.apiKey;

        const services = await db('services')
            .where({ 'services.department_id': department.id })
            .select('id', 'name')
            .orderBy('name', 'asc');

        res.json({
            department: req.apiKey.department,
            data: services
        });

    } catch (error) {
        console.error('Error fetching services list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/v1/issues
router.get('/v1/issues', async(req, res) => {
    try {
        const { department } = req.apiKey;
        let { page = 1, limit = 25, id, service_id, status, wcag_criteria, planned_fix, issue_type } = req.query;
        const fetchAll = limit === 'all';

        const query = db('issues')
            .join('services', 'issues.service_id', 'services.id')
            .where('services.department_id', department.id);

        const countQuery = db('issues')
            .join('services', 'issues.service_id', 'services.id')
            .where('services.department_id', department.id)
            .count('issues.id as total');

        if (id) {
            query.where({ 'issues.id': id });
            countQuery.where({ 'issues.id': id });
        }

        if (service_id) {
            query.where({ service_id });
            countQuery.where({ service_id });
        }

        if (status) {
            const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
            if (validStatuses.includes(status)) {
                query.where({ status });
                countQuery.where({ status });
            }
        }

        if (wcag_criteria) {
            query.where('wcag_criteria', 'like', `%${wcag_criteria}%`);
            countQuery.where('wcag_criteria', 'like', `%${wcag_criteria}%`);
        }

        if (planned_fix !== undefined) {
            const hasPlannedFix = ['true', '1'].includes(String(planned_fix).toLowerCase());
            query.where({ planned_fix: hasPlannedFix });
            countQuery.where({ planned_fix: hasPlannedFix });
        }

        if (issue_type) {
            query.whereExists(function() {
                this.select('*').from('issue_types')
                    .whereRaw('issue_types.issue_id = issues.id')
                    .andWhere('issue_types.type', issue_type);
            });
            countQuery.whereExists(function() {
                this.select('*').from('issue_types')
                    .whereRaw('issue_types.issue_id = issues.id')
                    .andWhere('issue_types.type', issue_type);
            });
        }

        const result = await countQuery.first();
        const total = result ? result.total : 0;

        if (fetchAll) {
            page = 1;
            limit = total;
        }
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const issues = await query.select('issues.*').limit(parseInt(limit, 10)).offset(offset);

        res.json({
            department: req.apiKey.department,
            data: issues,
            pagination: {
                total: parseInt(total),
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching issues:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;