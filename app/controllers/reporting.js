const { db } = require('../db');
const { getDepartmentServices, getService } = require('../data/services');
const { getServiceIssues } = require('../data/issues');
const dotenv = require('dotenv');

dotenv.config();



// WCAG criteria data structure - expanded to include all levels
const wcagCriteria = {
    // Level A
    '1.1.1': { title: 'Non-text Content', level: 'A' },
    '1.2.1': { title: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
    '1.2.2': { title: 'Captions (Prerecorded)', level: 'A' },
    '1.2.3': { title: 'Audio Description or Media Alternative (Prerecorded)', level: 'A' },
    '1.3.1': { title: 'Info and Relationships', level: 'A' },
    '1.3.2': { title: 'Meaningful Sequence', level: 'A' },
    '1.3.3': { title: 'Sensory Characteristics', level: 'A' },
    '1.4.1': { title: 'Use of Color', level: 'A' },
    '1.4.2': { title: 'Audio Control', level: 'A' },
    '2.1.1': { title: 'Keyboard', level: 'A' },
    '2.1.2': { title: 'No Keyboard Trap', level: 'A' },
    '2.2.1': { title: 'Timing Adjustable', level: 'A' },
    '2.2.2': { title: 'Pause, Stop, Hide', level: 'A' },
    '2.3.1': { title: 'Three Flashes or Below Threshold', level: 'A' },
    '2.4.1': { title: 'Bypass Blocks', level: 'A' },
    '2.4.2': { title: 'Page Titled', level: 'A' },
    '2.4.3': { title: 'Focus Order', level: 'A' },
    '2.4.4': { title: 'Link Purpose (In Context)', level: 'A' },
    '2.5.1': { title: 'Pointer Gestures', level: 'A' },
    '2.5.2': { title: 'Pointer Cancellation', level: 'A' },
    '2.5.3': { title: 'Label in Name', level: 'A' },
    '2.5.4': { title: 'Motion Actuation', level: 'A' },
    '3.1.1': { title: 'Language of Page', level: 'A' },
    '3.2.1': { title: 'On Focus', level: 'A' },
    '3.2.2': { title: 'On Input', level: 'A' },
    '3.3.1': { title: 'Error Identification', level: 'A' },
    '3.3.2': { title: 'Labels or Instructions', level: 'A' },
    '4.1.1': { title: 'Parsing', level: 'A' },
    '4.1.2': { title: 'Name, Role, Value', level: 'A' },

    // Level AA
    '1.2.4': { title: 'Captions (Live)', level: 'AA' },
    '1.2.5': { title: 'Audio Description (Prerecorded)', level: 'AA' },
    '1.3.4': { title: 'Orientation', level: 'AA' },
    '1.3.5': { title: 'Identify Input Purpose', level: 'AA' },
    '1.4.3': { title: 'Contrast (Minimum)', level: 'AA' },
    '1.4.4': { title: 'Resize Text', level: 'AA' },
    '1.4.5': { title: 'Images of Text', level: 'AA' },
    '1.4.10': { title: 'Reflow', level: 'AA' },
    '1.4.11': { title: 'Non-text Contrast', level: 'AA' },
    '1.4.12': { title: 'Text Spacing', level: 'AA' },
    '1.4.13': { title: 'Content on Hover or Focus', level: 'AA' },
    '2.4.5': { title: 'Multiple Ways', level: 'AA' },
    '2.4.6': { title: 'Headings and Labels', level: 'AA' },
    '2.4.7': { title: 'Focus Visible', level: 'AA' },
    '2.5.5': { title: 'Target Size', level: 'AA' },
    '3.1.2': { title: 'Language of Parts', level: 'AA' },
    '3.2.3': { title: 'Consistent Navigation', level: 'AA' },
    '3.2.4': { title: 'Consistent Identification', level: 'AA' },
    '3.3.3': { title: 'Error Suggestion', level: 'AA' },
    '3.3.4': { title: 'Error Prevention (Legal, Financial, Data)', level: 'AA' },
    '4.1.3': { title: 'Status Messages', level: 'AA' },

    // Level AAA
    '1.2.6': { title: 'Sign Language (Prerecorded)', level: 'AAA' },
    '1.2.7': { title: 'Extended Audio Description (Prerecorded)', level: 'AAA' },
    '1.2.8': { title: 'Media Alternative (Prerecorded)', level: 'AAA' },
    '1.2.9': { title: 'Audio-only (Live)', level: 'AAA' },
    '1.3.6': { title: 'Identify Purpose', level: 'AAA' },
    '1.4.6': { title: 'Contrast (Enhanced)', level: 'AAA' },
    '1.4.7': { title: 'Low or No Background Audio', level: 'AAA' },
    '1.4.8': { title: 'Visual Presentation', level: 'AAA' },
    '1.4.9': { title: 'Images of Text (No Exception)', level: 'AAA' },
    '2.1.3': { title: 'Keyboard (No Exception)', level: 'AAA' },
    '2.2.3': { title: 'No Timing', level: 'AAA' },
    '2.2.4': { title: 'Interruptions', level: 'AAA' },
    '2.2.5': { title: 'Re-authenticating', level: 'AAA' },
    '2.2.6': { title: 'Timeouts', level: 'AAA' },
    '2.3.2': { title: 'Three Flashes', level: 'AAA' },
    '2.3.3': { title: 'Animation from Interactions', level: 'AAA' },
    '2.4.8': { title: 'Location', level: 'AAA' },
    '2.4.9': { title: 'Link Purpose (Link Only)', level: 'AAA' },
    '2.4.10': { title: 'Section Headings', level: 'AAA' },
    '2.5.6': { title: 'Concurrent Input Mechanisms', level: 'AAA' },
    '3.1.3': { title: 'Unusual Words', level: 'AAA' },
    '3.1.4': { title: 'Abbreviations', level: 'AAA' },
    '3.1.5': { title: 'Reading Level', level: 'AAA' },
    '3.1.6': { title: 'Pronunciation', level: 'AAA' },
    '3.2.5': { title: 'Change on Request', level: 'AAA' },
    '3.3.5': { title: 'Help', level: 'AAA' },
    '3.3.6': { title: 'Error Prevention (All)', level: 'AAA' }
};

/**
 * Show the WCAG criteria heatmap report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showWcagHeatmap(req, res) {

    const redThreshold = parseInt(process.env.RED_THRESHOLD) || 20;

    // Debug logging
    console.log('RED_THRESHOLD from env:', process.env.RED_THRESHOLD);
    console.log('redThreshold parsed:', redThreshold);

    try {
        // Double check authentication
        if (!req.session.user) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/sign-in');
        }

        const user = req.session.user;
        const departmentId = user.department.id;
        const serviceId = req.params.serviceId;

        // Get the specific service
        const service = await getService(serviceId);

        // Verify the service belongs to the user's department
        if (!service || service.department_id !== departmentId) {
            return res.status(404).render('error', {
                error: 'Service not found',
                details: 'The requested service could not be found in your department'
            });
        }

        // Get issues for the specific service
        const issues = await getServiceIssues(serviceId);

        // Filter for open issues only
        const openIssues = issues.filter(issue => issue.status === 'open');

        // Count issues by WCAG criterion and determine rating
        const wcagData = {};
        openIssues.forEach(issue => {
            if (issue.wcag_criterion) {
                if (!wcagData[issue.wcag_criterion]) {
                    wcagData[issue.wcag_criterion] = {
                        count: 0,
                        rating: 'green' // Default to green
                    };
                }
                wcagData[issue.wcag_criterion].count++;

                // Determine rating based on count
                if (wcagData[issue.wcag_criterion].count >= redThreshold) {
                    wcagData[issue.wcag_criterion].rating = 'red';
                    console.log(`Setting ${issue.wcag_criterion} to red: count=${wcagData[issue.wcag_criterion].count}, threshold=${redThreshold}`);
                } else if (wcagData[issue.wcag_criterion].count >= 1) {
                    wcagData[issue.wcag_criterion].rating = 'amber';
                } else {
                    wcagData[issue.wcag_criterion].rating = 'green';
                }
            }
        });

        res.render('services/department_admin/reporting/index', {
            service,
            wcagData,
            wcagCriteria
        });
    } catch (error) {
        console.error('Reporting error:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the report',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    showWcagHeatmap
};