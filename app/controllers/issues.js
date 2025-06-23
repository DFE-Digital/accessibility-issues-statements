const issuesData = require('../data/issues');
const servicesData = require('../data/services');
const { createComment, getIssueComments, deleteComment } = require('../data/comments');
const { getWcagCriteria, getWcagCriteriaByCriterion } = require('../data/wcag_criteria');
const { db } = require('../db');
const { getIssueResources, createResource, deleteResource } = require('../data/issue_resources');
const NotifyClient = require('notifications-node-client').NotifyClient;
const notifyClient = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY);
const designOpsEmail = process.env.DESIGN_OPS_EMAIL;

const index = async(req, res) => {
    try {
        const { user } = req.session;
        const filters = {
            wcag_level: req.query.wcag_level || '',
            service_id: req.query.service_id || '',
            planned_fix: req.query.planned_fix || '',
            planned_fix_date: req.query.planned_fix_date || '',
            search: req.query.search || '',
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10
        };

        // Ensure limit is a positive integer
        if (isNaN(filters.limit) || filters.limit <= 0) {
            filters.limit = 10;
        }

        let issues;
        let pagination;
        if (user.role === 'super_admin') {
            issues = await issuesData.getAllIssues();
        } else {
            // Get department ID from user's department object
            const departmentId = user.department.id;
            if (!departmentId) {
                throw new Error('User department ID not found');
            }
            const result = await issuesData.getDepartmentOpenIssues(departmentId, filters.page, filters.limit);
            issues = result.issues;
            pagination = result.pagination;
        }

        // Apply filters
        if (filters.wcag_level) {
            // Handle both single value (string) and multiple values (array)
            const selectedLevels = Array.isArray(filters.wcag_level) ? filters.wcag_level : [filters.wcag_level];
            issues = issues.filter(issue => selectedLevels.includes(issue.wcag_level));
        }

        if (filters.service_id) {
            issues = issues.filter(issue => issue.service_id === filters.service_id);
        }

        if (filters.planned_fix !== '') {
            const hasPlannedFix = filters.planned_fix === 'true';
            issues = issues.filter(issue => issue.planned_fix === hasPlannedFix);
        }

        if (filters.planned_fix_date) {
            const now = new Date();
            issues = issues.filter(issue => {
                if (!issue.planned_fix_date) return false;
                const fixDate = new Date(issue.planned_fix_date);

                switch (filters.planned_fix_date) {
                    case 'overdue':
                        return fixDate < now;
                    case 'next_month':
                        const nextMonth = new Date(now);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        return fixDate >= now && fixDate <= nextMonth;
                    case 'next_3_months':
                        const next3Months = new Date(now);
                        next3Months.setMonth(next3Months.getMonth() + 3);
                        return fixDate >= now && fixDate <= next3Months;
                    case 'next_6_months':
                        const next6Months = new Date(now);
                        next6Months.setMonth(next6Months.getMonth() + 6);
                        return fixDate >= now && fixDate <= next6Months;
                    default:
                        return true;
                }
            });
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            issues = issues.filter(issue =>
                issue.title.toLowerCase().includes(searchTerm) ||
                issue.service_name.toLowerCase().includes(searchTerm) ||
                issue.wcag_level.toLowerCase().includes(searchTerm)
            );
        }

        // Recalculate pagination after filtering
        if (user.role === 'super_admin') {
            const totalIssues = issues.length;
            const totalPages = Math.ceil(totalIssues / filters.limit);
            const offset = (filters.page - 1) * filters.limit;
            issues = issues.slice(offset, offset + filters.limit);
            pagination = {
                total: totalIssues,
                page: filters.page,
                limit: filters.limit,
                totalPages
            };
        }

        // Get services for the department
        let services = [];
        if (user.role === 'super_admin') {
            // For super admin, get all services
            services = await servicesData.getAllServices();
        } else {
            // For department admin, get department services
            services = await servicesData.getDepartmentServices(user.department.id);
        }

        res.render('department_admin/issues/index', {
            issues,
            services,
            filters,
            pagination,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error in issues index:', error);
        res.status(500).render('error', { error: 'Failed to load issues' });
    }
};

const issuesByCriterion = async(req, res) => {
    const { criterion } = req.params;
    const issues = await issuesData.getIssuesByCriterion(criterion);
    const wcagCriteria = await getWcagCriteriaByCriterion(criterion);

    res.render('department_admin/issues/criteria', { issues, wcagCriteria, user: req.session.user });
};

/**
 * Show new issue form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showNewIssueForm(req, res) {
    try {
        const { serviceId } = req.params;
        const user = req.session.user;

        // Verify service belongs to user's department
        const services = await servicesData.getDepartmentServices(user.department.id);
        const service = services.find(s => s.id === serviceId);

        if (!service) {
            return res.status(404).render('error', {
                error: {
                    title: 'Service not found',
                    message: 'The service you are looking for could not be found.'
                }
            });
        }

        // Get WCAG criteria for the form
        const wcag_criteria = await getWcagCriteria();

        res.render('services/department_admin/issues/new', {
            service,
            wcag_criteria,
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing new issue form:', error);
        res.status(500).render('error', {
            error: {
                title: 'Error',
                message: 'There was a problem loading the new issue form.'
            }
        });
    }
}

/**
 * Create a new issue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCreateIssue(req, res) {
    try {
        const { serviceId } = req.params;
        const user = req.session.user;

        // Verify service belongs to user's department
        const services = await servicesData.getDepartmentServices(user.department.id);
        const service = services.find(s => s.id === serviceId);

        if (!service) {
            return res.status(404).render('error', {
                error: {
                    title: 'Service not found',
                    message: 'The service you are looking for could not be found.'
                }
            });
        }

        // Get the WCAG criteria to determine risk level
        const wcag_criteria = await getWcagCriteria();

        // Use the priority from the form as the risk level
        const risk_level = req.body.priority || 'low'; // Use priority from form

        // Convert issue types to array if needed
        const issueTypes = Array.isArray(req.body.issue_types) ?
            req.body.issue_types : [req.body.issue_types];

        // Convert WCAG criteria to array if needed
        const selectedWcagCriteria = req.body.wcag_criteria ?
            (Array.isArray(req.body.wcag_criteria) ?
                req.body.wcag_criteria : [req.body.wcag_criteria]) : [];

        const issueData = {
            service_id: serviceId,
            title: req.body.title,
            description: req.body.description,
            risk_level: risk_level,
            source_of_discovery: req.body.source_of_discovery,
            status: 'open',
            created_by: user.id,
            planned_fix: req.body.planned_fix === 'true',
            planned_fix_date: req.body.planned_fix === 'true' ?
                `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` : null,
            not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
        };

        // Create issue with types and WCAG criteria
        await issuesData.createIssue(issueData, selectedWcagCriteria, issueTypes);

        res.redirect(`/services/${serviceId}/issues`);
    } catch (error) {
        console.error('Error creating issue:', error);
        res.status(500).render('error', {
            error: {
                title: 'Error',
                message: 'There was a problem creating the issue.'
            }
        });
    }
}

/**
 * Show issue details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showIssueDetails(req, res) {
    try {
        const { serviceId, id } = req.params;
        const user = req.session.user;

        // Verify service belongs to user's department
        const services = await servicesData.getDepartmentServices(user.department.id);
        const service = services.find(s => s.id === serviceId);

        if (!service) {
            return res.status(404).render('error', {
                error: {
                    title: 'Service not found',
                    message: 'The service you are looking for could not be found.'
                }
            });
        }

        // Get the issue
        const issue = await issuesData.getIssue(id);
        if (!issue) {
            return res.status(404).render('error', {
                error: {
                    title: 'Issue not found',
                    message: 'The issue you are looking for could not be found.'
                }
            });
        }

        // Get comments and resources
        const comments = await getIssueComments(id);
        const resources = await getIssueResources(id);

        res.render('services/department_admin/issues/show', {
            service,
            issue,
            comments,
            resources,
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing issue details:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the issue details.'
        });
    }
}

/**
 * Show edit issue form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showEditIssueForm(req, res) {
    try {
        const { serviceId, id } = req.params;
        const user = req.session.user;

        // Verify service belongs to user's department
        const services = await servicesData.getDepartmentServices(user.department.id);
        const service = services.find(s => s.id === serviceId);

        if (!service) {
            return res.status(404).render('error', {
                error: {
                    title: 'Service not found',
                    message: 'The service you are looking for could not be found.'
                }
            });
        }

        // Get the issue
        const issue = await issuesData.getIssue(id);
        if (!issue) {
            return res.status(404).render('error', {
                error: {
                    title: 'Issue not found',
                    message: 'The issue you are looking for could not be found.'
                }
            });
        }

        // Get WCAG criteria for the form
        const wcag_criteria = await getWcagCriteria();

        res.render('services/department_admin/issues/edit', {
            service,
            issue,
            wcag_criteria,
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing edit issue form:', error);
        res.status(500).render('error', {
            error: {
                title: 'Error',
                message: 'There was a problem loading the edit issue form.'
            }
        });
    }
}

/**
 * Update an issue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleUpdateIssue(req, res) {
    try {
        const { serviceId, id } = req.params;
        const issueTypes = req.body.issue_types ? (Array.isArray(req.body.issue_types) ? req.body.issue_types : [req.body.issue_types]) : [];
        const selectedWcagCriteria = req.body.wcag_criteria ? (Array.isArray(req.body.wcag_criteria) ? req.body.wcag_criteria : [req.body.wcag_criteria]) : [];

        const issueData = {
            title: req.body.title,
            description: req.body.description,
            risk_level: req.body.priority,
            source_of_discovery: req.body.source_of_discovery,
            planned_fix: req.body.planned_fix === 'true',
            planned_fix_date: req.body.planned_fix === 'true' ?
                `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` : null,
            not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
        };
        await issuesData.updateIssue(id, issueData, selectedWcagCriteria, issueTypes);
        res.redirect(`/services/${serviceId}/issues/${id}`);
    } catch (error) {
        console.error('Error updating issue:', error);
        res.status(500).render('error', { error: 'Failed to update issue' });
    }
}

/**
 * Add a comment to an issue
 */
async function addComment(req, res) {
    try {
        const { serviceId, id: issueId } = req.params;
        const { comment } = req.body;
        const userId = req.session.user.id;

        if (!comment || comment.trim() === '') {
            return res.redirect(`/services/${serviceId}/issues/${issueId}?error=comment_empty`);
        }

        await createComment({
            issue_id: issueId,
            user_id: userId,
            content: comment
        });

        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).render('error', { error: 'Failed to add comment' });
    }
}

/**
 * Delete a comment
 */
async function handleDeleteComment(req, res) {
    try {
        const { serviceId, id: issueId, commentId } = req.params;
        const comment = await db('issue_comments').where('id', commentId).first();

        if (comment.user_id !== req.session.user.id && req.session.user.role !== 'super_admin') {
            return res.redirect(`/services/${serviceId}/issues/${issueId}?error=permission`);
        }

        await deleteComment(commentId);
        res.redirect(`/services/${serviceId}/issues/${issueId}?success=comment_deleted`);
    } catch (error) {
        console.error('Error deleting comment:', error);
        const { serviceId, id } = req.params;
        res.redirect(`/services/${serviceId}/issues/${id}?error=delete_failed`);
    }
}

/**
 * Handle closing an issue
 */
async function handleCloseIssue(req, res) {
    try {
        const { serviceId, id: issueId } = req.params;
        const { comment } = req.body;
        const userId = req.session.user.id;

        const issueData = {
            status: 'closed',
            closed_date: new Date()
        };

        await issuesData.updateIssue(issueId, issueData);

        // Add a comment
        const closeComment = `Issue closed by ${req.session.user.first_name} ${req.session.user.last_name}. Reason: ${comment}`;
        await createComment({
            issue_id: issueId,
            user_id: userId,
            content: closeComment
        });

        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error closing issue:', error);
        res.status(500).render('error', { error: 'Failed to close issue' });
    }
}

/**
 * Handle reopening an issue
 */
async function handleReopenIssue(req, res) {
    try {
        const { serviceId, id: issueId } = req.params;
        const userId = req.session.user.id;

        const issueData = {
            status: 'open',
            closed_date: null
        };

        await issuesData.updateIssue(issueId, issueData);

        // Add a comment
        const reopenComment = `Issue reopened by ${req.session.user.first_name} ${req.session.user.last_name}.`;
        await createComment({
            issue_id: issueId,
            user_id: userId,
            content: reopenComment
        });

        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error reopening issue:', error);
        res.status(500).render('error', { error: 'Failed to reopen issue' });
    }
}

/**
 * Assign an issue to a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function assignIssue(req, res) {
    try {
        const { serviceId, id: issueId } = req.params;
        const { assigned_to } = req.body;
        const userId = req.session.user.id;
        const assignedUser = await db('users').where('id', assigned_to).first();

        const issueData = {
            assigned_to: assigned_to
        };
        await issuesData.updateIssue(issueId, issueData);

        // Add a comment
        const comment = `Issue assigned to ${assignedUser.first_name} ${assignedUser.last_name} by ${req.session.user.first_name} ${req.session.user.last_name}.`;
        await createComment({
            issue_id: issueId,
            user_id: userId,
            content: comment
        });

        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error assigning issue:', error);
        res.status(500).render('error', { error: 'Failed to assign issue' });
    }
}

const requestRetest = async(req, res) => {
    try {
        const { serviceId, id } = req.params;

        // Check for required environment variables
        if (!process.env.GOVUK_NOTIFY_API_KEY || !process.env.GOVUK_NOTIFY_RETESTREQUEST_TEMPLATE_ID) {
            console.error('Missing GOV.UK Notify environment variables');
            return res.redirect(`/services/${serviceId}/issues/${id}?error=notify_config`);
        }

        const userId = req.session.user.id;
        const assignedUser = await db('users').where('id', userId).first();

        // Update issue in database
        await issuesData.requestRetest(id);

        // Assign issue to signed in user
        const issueData = {
            assigned_to: req.session.user.id
        };

        await issuesData.updateIssue(id, issueData);

        // Add a comment
        let comment = `Issue assigned to ${assignedUser.first_name} ${assignedUser.last_name} by system for retest request.`;
        await createComment({
            issue_id: id,
            user_id: userId,
            content: comment
        });

        // Get issue and service details for email
        const issue = await issuesData.getIssue(id);
        const service = await servicesData.getService(serviceId);

        // Send email notification
        await notifyClient.sendEmail(
            process.env.GOVUK_NOTIFY_RETESTREQUEST_TEMPLATE_ID,
            process.env.DESIGN_OPS_EMAIL, {
                personalisation: {
                    title: issue.title,
                    serviceName: service.name,
                    link: `${req.protocol}://${req.get('host')}/services/${serviceId}/issues/${id}`,
                    requestorEmail: req.session.user.email
                }
            }
        );


        // Add a comment
        comment = `Retest request sent by ${assignedUser.first_name} ${assignedUser.last_name}.`;
        await createComment({
            issue_id: id,
            user_id: userId,
            content: comment
        });

        res.redirect(`/services/${serviceId}/issues/${id}?success=retest_requested`);

    } catch (error) {
        console.error('Error requesting retest:', error);
        res.redirect(`/services/${req.params.serviceId}/issues/${req.params.id}?error=retest_failed`);
    }
};

const completeRetest = async(req, res) => {
    try {
        const { serviceId, id } = req.params;
        const { comment } = req.body;
        const userId = req.session.user.id;

        // Update issue to remove retest request flag
        await issuesData.completeRetest(id);

        // Add a comment with the retest outcome
        await createComment({
            issue_id: id,
            user_id: userId,
            content: `Retest completed: ${comment}`
        });

        // Get issue details to find assigned user
        const issue = await issuesData.getIssue(id);
        const service = await servicesData.getService(serviceId);

        // Notify the assigned user
        if (issue.assigned_to_email) {
            await notifyClient.sendEmail(
                process.env.GOVUK_NOTIFY_RETESTCOMPLETE_TEMPLATE_ID,
                issue.assigned_to_email, {
                    personalisation: {
                        title: issue.title,
                        serviceName: service.service_name,
                        comment: comment,
                        link: `${req.protocol}://${req.get('host')}/services/${serviceId}/issues/${id}`
                    }
                }
            );
        }

        res.redirect(`/services/${serviceId}/issues/${id}?success=retest_completed`);

    } catch (error) {
        console.error('Error completing retest:', error);
        res.redirect(`/services/${req.params.serviceId}/issues/${req.params.id}?error=retest_complete_failed`);
    }
};

/**
 * Show closed issues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showClosedIssues(req, res) {
    try {
        const { user } = req.session;
        let issues;
        if (user.role === 'super_admin') {
            issues = await issuesData.getAllIssues().where('status', 'closed');
        } else {
            issues = await issuesData.getDepartmentIssues(user.department.id).where('status', 'closed');
        }
        res.render('department_admin/issues/closed', { issues });
    } catch (error) {
        console.error('Error showing closed issues:', error);
        res.status(500).render('error', { error: 'Failed to load closed issues' });
    }
}

/**
 * Show overdue issues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showOverdueIssues(req, res) {
    try {
        const { user } = req.session;
        const departmentId = user.department.id;
        const issues = await issuesData.getDepartmentOverdueIssues(departmentId);
        res.render('department_admin/issues/overdue', { issues });
    } catch (error) {
        console.error('Error showing overdue issues:', error);
        res.status(500).render('error', { error: 'Failed to load overdue issues' });
    }
}

/**
 * Get resources for an issue
 */
async function getIssueResourcesController(req, res) {
    try {
        const { id } = req.params;
        const resources = await getIssueResources(id);
        res.json(resources);
    } catch (error) {
        console.error('Error getting issue resources:', error);
        res.status(500).json({ error: 'Failed to get issue resources' });
    }
}

/**
 * Add a new resource to an issue
 */
async function addIssueResource(req, res) {
    try {
        const { serviceId, id: issueId } = req.params;
        const { url, description } = req.body;
        const userId = req.session.user.id;

        await createResource({
            issue_id: issueId,
            url,
            description,
            added_by: userId
        });

        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error adding issue resource:', error);
        res.status(500).render('error', { error: 'Failed to add issue resource' });
    }
}

/**
 * Delete a resource
 */
async function deleteIssueResource(req, res) {
    try {
        const { serviceId, id: issueId, resourceId } = req.params;
        await deleteResource(resourceId);
        res.redirect(`/services/${serviceId}/issues/${issueId}`);
    } catch (error) {
        console.error('Error deleting issue resource:', error);
        res.status(500).render('error', { error: 'Failed to delete issue resource' });
    }
}

module.exports = {
    index,
    issuesByCriterion,
    showNewIssueForm,
    handleCreateIssue,
    showIssueDetails,
    showEditIssueForm,
    handleUpdateIssue,
    addComment,
    handleDeleteComment,
    handleCloseIssue,
    handleReopenIssue,
    assignIssue,
    showClosedIssues,
    showOverdueIssues,
    getIssueResourcesController,
    addIssueResource,
    deleteIssueResource,
    requestRetest,
    completeRetest
};