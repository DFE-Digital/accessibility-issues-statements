const { getDepartmentServices, getService, getServiceByNumericId } = require('../data/services');
const { getOpenIssues, getServiceIssues } = require('../data/issues');
const { getActiveTemplate, getActiveTemplateByName } = require('../data/statement_templates');
const { getServiceStatementSettings, getServiceContactSettings } = require('../data/service_statement_settings');
const marked = require('marked');
const { getWcagCriteria } = require('../data/wcag_criteria');

/**
 * Show statement index page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showStatementIndex(req, res) {
    try {
        const { serviceId } = req.params;
        const user = req.session.user;

        // Fetch the service by ID directly and check department ownership
        const service = await getService(serviceId);
        if (!service || service.department_id !== user.department.id) {
            return res.status(404).render('error', {
                error: {
                    title: 'Service not found',
                    message: 'The service you are looking for could not be found.'
                }
            });
        }

        // Get open issues count for compliance status
        const openIssues = await getOpenIssues(serviceId);
        service.open_issues = openIssues.length;

        // Get base URL from environment or use a default
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

        // Get statement settings to determine if the statement is able to be enrolled. All statement settings are required to be set.
        // and the service contact settings need at least 1 contact method.
        const statementSettings = await getServiceStatementSettings(serviceId);
        const serviceContactSettings = await getServiceContactSettings(serviceId);

        let ableToEnroll = false;
        if (statementSettings.complaint_contact && statementSettings.response_time_sla && statementSettings.last_audit_date && statementSettings.last_audit_by && statementSettings.last_audit_method && serviceContactSettings.length > 0) {
            ableToEnroll = true;
        }

        res.render('services/department_admin/statement/index', {
            service,
            baseUrl,
            statementUrl: `${baseUrl}/s/${service.numeric_id}`,
            ableToEnroll,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing statement index:', error);
        res.status(500).render('error', {
            error: {
                title: 'Error',
                message: 'There was a problem loading the accessibility statement.'
            }
        });
    }
}

function formatDate(dateString) {
    if (!dateString) return '[Not provided]';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatContactMethods(contactMethods) {
    if (!contactMethods || contactMethods.length === 0) {
        return '[Contact methods not provided]';
    }

    // Format each contact method as a list item
    const formattedMethods = contactMethods.map(method => {
        const type = method.type || method.contact_type; // Handle both property names
        const value = method.value || method.contact_value;

        switch (type) {
            case 'email':
                return `* email: ${value}`;
            case 'phone':
                return `* phone: ${value}`;
            case 'online_form':
                return `* [fill in our online form](${value})`;
            default:
                return `* ${value}`;
        }
    });

    // Return the list items joined with newlines
    return formattedMethods.join('\n');
}

async function replaceTemplateParameters(serviceId, content, issuesWithWcagCriteria, template) {
    const service = await getService(serviceId);
    const settings = await getServiceStatementSettings(serviceId);
    const serviceContactSettings = await getServiceContactSettings(serviceId);

    // Get today's date in the correct format
    const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const replacements = {
        '{{ name_of_service }}': service.name,
        '{{ department_name }}': service.department_name,
        '{{ contact_email }}': service.contact_email,
        '{{ statement_version }}': template.version || '1.0',
        '{{ service_url }}': service.url,
        '{{ response_time_sla }}': settings ? settings.response_time_sla || '[Response time not set]' : '[Response time not set]',
        '{{ complaint_contact }}': settings ? settings.complaint_contact || '[Complaint contact not provided]' : '[Complaint contact not provided]',
        '{{ last_audit_date }}': formatDate(settings ? settings.last_audit_date : '[Last audit date not set]'),
        '{{ last_audit_by }}': settings ? settings.last_audit_by || '[Auditor not specified]' : '[Auditor not specified]',
        '{{ last_audit_method }}': settings ? settings.last_audit_method || '[Audit method not specified]' : '[Audit method not specified]',
        '{{ contact_methods }}': formatContactMethods(serviceContactSettings),
        '{{ today }}': today,
        '{{ issues_basic }}': issuesWithWcagCriteria.length > 0 ?
            issuesWithWcagCriteria.map(issue => {
                return `- ${issue.title}`;
            }).join('\n') : 'No issues with WCAG criteria',
        '{{ issues_detailed }}': issuesWithWcagCriteria.length > 0 ?
            issuesWithWcagCriteria.map(issue => {
                const description = issue.description || 'No description provided';
                const wcagCriteria = issue.wcag_criteria
                    .filter(criterion => criterion.level === 'A' || criterion.level === 'AA')
                    .map(criterion =>
                        `${criterion.criterion} - ${criterion.title} (${criterion.level})`
                    ).join('\n');

                let resolutionInfo = 'No resolution information provided';
                if (issue.planned_fix === true && issue.planned_fix_date) {
                    const fixDate = new Date(issue.planned_fix_date).toLocaleDateString('en-GB', {
                        month: 'long',
                        year: 'numeric'
                    });
                    resolutionInfo = `Planning to resolve by ${fixDate}`;
                } else if (issue.planned_fix === false && issue.not_fixing_reason) {
                    resolutionInfo = `${issue.not_fixing_reason}`;
                }

                return `#### ${issue.title}

${description}

**WCAG Criteria:**
${wcagCriteria}

**Resolution Information:**
${resolutionInfo}

<hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible"></hr>`;
            }).join('\n\n') : 'No issues with WCAG criteria'
    };

    let replacedContent = content;
    for (const [key, value] of Object.entries(replacements)) {
        replacedContent = replacedContent.replace(new RegExp(key, 'g'), value || '[Not provided]');
    }

    return replacedContent;
}

/**
 * Show public statement page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showPublicStatement(req, res) {
    try {
        const numericId = req.params.numericId;
        const service = await getServiceByNumericId(numericId);

        if (!service) {
            return res.status(404).render('404');
        }

        // Get all issues and filter for open ones
        const allIssues = await getServiceIssues(service.id);
        const openIssues = allIssues.filter(issue => issue.status === 'open');

        // How many WCAG Criteria are there at Level A and AA?
        const wcagCriteria = await getWcagCriteria();
        const wcagCriteriaAtLevelsAAndAA = wcagCriteria.filter(criterion => criterion.level === 'A' || criterion.level === 'AA');



        // Get all unique WCAG criteria at levels A and AA
        const allWcagCriteria = new Set();
        openIssues.forEach(issue => {
            if (issue.wcag_criteria && issue.wcag_criteria.length > 0) {
                issue.wcag_criteria.forEach(criterion => {
                    if (criterion.level === 'A' || criterion.level === 'AA') {
                        allWcagCriteria.add(criterion.criterion);
                    }
                });
            }
        });

        // Get issues with WCAG criteria at levels A and AA
        const issuesWithWcagCriteria = openIssues.filter(issue =>
            issue.wcag_criteria &&
            issue.wcag_criteria.some(criterion => criterion.level === 'A' || criterion.level === 'AA')
        );

        // Count unique WCAG criteria in issues
        const uniqueWcagCriteriaInIssues = new Set();
        issuesWithWcagCriteria.forEach(issue => {
            issue.wcag_criteria.forEach(criterion => {
                if (criterion.level === 'A' || criterion.level === 'AA') {
                    uniqueWcagCriteriaInIssues.add(criterion.criterion);
                }
            });
        });

        const totalWcagCriteria = allWcagCriteria.size;
        const affectedWcagCriteria = uniqueWcagCriteriaInIssues.size;
        const percentageAffected = (affectedWcagCriteria / wcagCriteriaAtLevelsAAndAA.length) * 100;

        console.log(totalWcagCriteria);
        console.log(affectedWcagCriteria);
        console.log(percentageAffected);

        // Determine which template to use based on percentage of affected WCAG criteria
        let templateName;
        if (affectedWcagCriteria === 0) {
            templateName = 'Compliant';
        } else if (percentageAffected <= 50) {
            templateName = 'Partially compliant';
        } else {
            templateName = 'Non-compliant';
        }

        console.log(affectedWcagCriteria);
        console.log(percentageAffected);

        const template = await getActiveTemplateByName(templateName);

        if (!template) {
            return res.status(404).render('404');
        }

        // Replace template parameters and convert to HTML
        const statementHtml = await replaceTemplateParameters(service.id, template.content, issuesWithWcagCriteria, template);

        res.render('public/statement', {
            service,
            issues: issuesWithWcagCriteria,
            statementHtml,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing public statement:', error);
        res.status(500).render('500');
    }
}

module.exports = {
    showStatementIndex,
    showPublicStatement
};