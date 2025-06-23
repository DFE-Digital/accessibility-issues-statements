const dashboardData = require('../data/dashboard');
const validator = require('validator');
const { getDepartmentServices } = require('../data/services');
const { getServiceIssues } = require('../data/issues');
const { getUserServices } = require('../data/services');
const { db } = require('../db');
const departmentAdminController = require('./department_admin');

/**
 * Safely escape a string value, returning empty string for undefined/null
 * @param {string} value - Value to escape
 * @returns {string} Escaped string or empty string
 */
function safeEscape(value) {
    return value ? validator.escape(String(value)) : '';
}

/**
 * Render the dashboard page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = async(req, res) => {
    try {
        const user = req.session.user;

        if (user.role === 'super_admin') {
            return res.render('super_admin/super_admin/index', { user });
        }

        if (user.role === 'department_admin') {
            return res.redirect('/department-admin');
        }

        // Default to user role
        const services = await getUserServices(user.id);

        let issues = [];
        if (services.length > 0) {
            const serviceIssuesPromises = services.map(service => getServiceIssues(service.id));
            const allIssues = await Promise.all(serviceIssuesPromises);
            issues = allIssues.flat();
        }

        res.render('dashboard/user/index', {
            user: user,
            services,
            issues
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the dashboard',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Determine the compliance status of a service based on its issues
 * @param {Object} service - Service data object
 * @returns {string} Status: 'compliant', 'partially', 'or 'non-compliant'
 */
function determineServiceStatus(service) {
    if (!service.open_issues_count) {
        return 'compliant';
    }
    if (service.high_priority_issues > 0) {
        return 'non-compliant';
    }
    return 'partially';
}

async function getDashboardData(req, res) {
    try {
        const user = req.session.user;
        const services = await getDepartmentServices(user.department.id);

        // Get all issues for the department
        const allIssues = [];
        for (const service of services) {
            const issues = await getServiceIssues(service.id);
            allIssues.push(...issues);
        }

        // Count services
        const servicesCount = services.length;

        // Count open issues
        const openIssues = allIssues.filter(issue => issue.status === 'open');
        const openIssuesCount = openIssues.length;

        // Count overdue issues
        const today = new Date();
        const overdueIssuesCount = openIssues.filter(issue =>
            issue.planned_fix === true &&
            issue.planned_fix_date &&
            new Date(issue.planned_fix_date) < today
        ).length;

        // Count issues by WCAG level
        const wcagLevels = {};
        openIssues.forEach(issue => {
            if (issue.wcag_criteria) {
                issue.wcag_criteria.forEach(criterion => {
                    wcagLevels[criterion.level] = (wcagLevels[criterion.level] || 0) + 1;
                });
            }
        });

        // Format WCAG levels data for chart
        const wcagLevelsData = Object.entries(wcagLevels).map(([level, count]) => ({
            level,
            count
        }));

        // Count issues by WCAG criterion
        const wcagCriteria = {};
        openIssues.forEach(issue => {
            if (issue.wcag_criteria) {
                issue.wcag_criteria.forEach(criterion => {
                    const key = `${criterion.criterion} - ${criterion.title}`;
                    wcagCriteria[key] = (wcagCriteria[key] || 0) + 1;
                });
            }
        });

        // Get top 5 WCAG criteria
        const topWcagCriteria = Object.entries(wcagCriteria)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([criterion, count]) => ({
                criterion,
                count
            }));

        res.json({
            servicesCount,
            openIssuesCount,
            overdueIssuesCount,
            wcagLevels: wcagLevelsData,
            topWcagCriteria
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
}

module.exports = {
    index,
    getDashboardData
};