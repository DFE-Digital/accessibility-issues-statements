const { db } = require('../db');
const wcagCriteria = require('../data/wcag_criteria');

/**
 * Show reports index page
 */
const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const departmentId = req.session.user.department.id;

    // Get all open issues for the department
    const issues = await db('issue_wcag_criteria')
      .select(
        'issues.*',
        'services.name as service_name',
        'issue_wcag_criteria.wcag_criterion'
      )
      .join('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
      .join('services', 'issues.service_id', 'services.id')
      .where('issue_wcag_criteria.department_id', departmentId)
      .where('issues.status', 'open');

    // Count issues by WCAG criterion and determine rating
    const wcagData = {};
    
    // Initialize all WCAG criteria with default values
    Object.keys(wcagCriteria).forEach(criterion => {
      wcagData[criterion] = {
        count: 0,
        rating: 'green'
      };
    });

    // Count issues for each WCAG criterion
    issues.forEach(issue => {
      if (issue.wcag_criterion) {
        if (!wcagData[issue.wcag_criterion]) {
          wcagData[issue.wcag_criterion] = {
            count: 0,
            rating: 'green'
          };
        }
        wcagData[issue.wcag_criterion].count++;
        
        // Determine rating based on count
        if (wcagData[issue.wcag_criterion].count >= 5) {
          wcagData[issue.wcag_criterion].rating = 'red';
        } else if (wcagData[issue.wcag_criterion].count >= 1) {
          wcagData[issue.wcag_criterion].rating = 'amber';
        }
      }
    });

    res.render('department_admin/reports/index', {
      wcagData,
      wcagCriteria,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading reports:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the reports page',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show WCAG criterion details
 */
const showWcagCriterion = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { criterion } = req.params;
    const departmentId = req.session.user.department.id;

    // Get all issues for the specific WCAG criterion
    const issues = await db('issue_wcag_criteria')
      .select(
        'issues.*',
        'services.name as service_name',
        'services.id as service_id'
      )
      .join('issues', 'issue_wcag_criteria.issue_id', 'issues.id')
      .join('services', 'issues.service_id', 'services.id')
      .where('issue_wcag_criteria.department_id', departmentId)
      .where('issue_wcag_criteria.wcag_criterion', criterion)
      .orderBy('issues.created_at', 'desc');

    res.render('department_admin/reports/wcag_criterion', {
      criterion,
      criterionData: wcagCriteria[criterion],
      issues,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading WCAG criterion:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the WCAG criterion details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  index,
  showWcagCriterion
}; 