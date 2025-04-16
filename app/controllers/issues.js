const { getServiceIssues, getIssue, createIssue: createIssueData, updateIssue, getDepartmentIssues, getAllIssues, getOpenIssues, getIssuesByCriterion, getDepartmentOpenIssues } = require('../data/issues');
const { getDepartmentServices, getService, getAllServices } = require('../data/services');
const { createComment, getIssueComments, deleteComment } = require('../data/comments');
const { getWcagCriteria, getWcagCriteriaByCriterion } = require('../data/wcag_criteria');
const { db } = require('../db');
const { sendEmail } = require('../middleware/notify');


const index = async (req, res) => {
  try {
    const { user } = req.session;
    const filters = {
      wcag_level: req.query.wcag_level || '',
      service_id: req.query.service_id || '',
      planned_fix: req.query.planned_fix || '',
      planned_fix_date: req.query.planned_fix_date || '',
      search: req.query.search || ''
    };

    let issues;
    if (user.role === 'super_admin') {
      issues = await getAllIssues();
    } else {
      // Get department ID from user's department object
      const departmentId = user.department?.id;
      if (!departmentId) {
        throw new Error('User department ID not found');
      }
      issues = await getDepartmentOpenIssues(departmentId);
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
        issue.service_name?.toLowerCase().includes(searchTerm) ||
        issue.wcag_level?.toLowerCase().includes(searchTerm)
      );
    }

    // Get services for the department
    let services = [];
    if (user.role === 'super_admin') {
      // For super admin, get all services
      services = await getAllServices();
    } else {
      // For department admin, get department services
      services = await getDepartmentServices(user.department?.id);
    }

    res.render('department_admin/issues/index', {
      issues,
      services,
      filters
    });
  } catch (error) {
    console.error('Error in issues index:', error);
    res.status(500).render('error', { error: 'Failed to load issues' });
  }
};

const issuesByCriterion = async (req, res) => {
  const { criterion } = req.params;
  const issues = await getIssuesByCriterion(criterion);
  const wcagCriteria = await getWcagCriteriaByCriterion(criterion);

  res.render('department_admin/issues/criteria', { issues, wcagCriteria });
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
    const services = await getDepartmentServices(user.department.id);
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
      wcag_criteria
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
    const services = await getDepartmentServices(user.department.id);
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
    const issueTypes = Array.isArray(req.body.issue_types) 
      ? req.body.issue_types 
      : [req.body.issue_types];

    // Convert WCAG criteria to array if needed
    const selectedWcagCriteria = req.body.wcag_criteria 
      ? (Array.isArray(req.body.wcag_criteria) 
          ? req.body.wcag_criteria 
          : [req.body.wcag_criteria])
      : [];

    const issueData = {
      service_id: serviceId,
      title: req.body.title,
      description: req.body.description,
      risk_level: risk_level,
      source_of_discovery: req.body.source_of_discovery,
      status: 'open',
      created_by: user.id,
      planned_fix: req.body.planned_fix === 'true',
      planned_fix_date: req.body.planned_fix === 'true' 
        ? `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` 
        : null,
      not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
    };

    // Create issue with types and WCAG criteria
    await createIssueData(issueData, selectedWcagCriteria, issueTypes);

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
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);

    if (!issue || issue.service_id !== serviceId) {
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    // Get comments for the issue
    const comments = await getIssueComments(id);
    issue.comments = comments;

    // Get users for the department
    const users = await db('users')
      .where('department_id', user.department.id)
      .select('id', 'email', 'first_name', 'last_name')
      .orderBy('first_name', 'asc')
      .orderBy('last_name', 'asc');

    res.render('services/department_admin/issues/show', {
      service,
      issue,
      users
    });
  } catch (error) {
    console.error('Error showing issue:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the issue details.'
      }
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
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);

    if (!issue || issue.service_id !== serviceId) {
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
      wcag_criteria
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
    const user = req.session.user;

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);

    if (!issue || issue.service_id !== serviceId) {
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    // Convert issue types to array if needed
    const issueTypes = Array.isArray(req.body.issue_types) 
      ? req.body.issue_types 
      : [req.body.issue_types];

    // Convert WCAG criteria to array if needed
    const selectedWcagCriteria = req.body.wcag_criteria 
      ? (Array.isArray(req.body.wcag_criteria) 
          ? req.body.wcag_criteria 
          : [req.body.wcag_criteria])
      : [];

    const issueData = {
      title: req.body.title,
      description: req.body.description,
      risk_level: req.body.risk_level,
      source_of_discovery: req.body.source_of_discovery,
      status: req.body.status,
      planned_fix: req.body.planned_fix === 'true',
      planned_fix_date: req.body.planned_fix === 'true' ? `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` : null,
      not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
    };

    await updateIssue(id, issueData, selectedWcagCriteria, issueTypes);

    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem updating the issue.'
      }
    });
  }
}

/**
 * Add a comment to an issue
 */
async function addComment(req, res) {
  try {
    const { serviceId, id } = req.params;
    const { comment } = req.body;
    const user = req.session.user;

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);
    if (!issue || issue.service_id !== serviceId) {
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    await createComment({
      issue_id: id,
      user_id: user.id,
      content: comment
    });

    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem adding the comment.'
      }
    });
  }
}

/**
 * Delete a comment
 */
async function handleDeleteComment(req, res) {
  try {
    const { serviceId, id, commentId } = req.params;
    const user = req.session.user;

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);
    if (!issue || issue.service_id !== serviceId) {
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    const deleted = await deleteComment(commentId, user.id);
    


    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem deleting the comment.'
      }
    });
  }
}

/**
 * Handle closing an issue
 */
async function handleCloseIssue(req, res) {
  try {
    const { serviceId, id } = req.params;
    const { comment } = req.body;
    const user = req.session.user;

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);
    if (!issue || issue.service_id !== serviceId) {
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    // Update issue status and set closed date
    await updateIssue(id, {
      status: 'closed',
      closed_date: new Date()
    });

    // Add closure comment
    await createComment({
      issue_id: id,
      user_id: user.id,
      content: comment,
      type: 'closure'
    });

    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error closing issue:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem closing the issue.'
      }
    });
  }
}

/**
 * Handle reopening an issue
 */
async function handleReopenIssue(req, res) {
  try {
    const { serviceId, id } = req.params;
    const { comment } = req.body;
    const user = req.session.user;

    console.log('Reopening issue:', { serviceId, id, comment, userId: user.id });

    // Verify service belongs to user's department
    const services = await getDepartmentServices(user.department.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      console.log('Service not found');
      return res.status(404).render('error', {
        error: {
          title: 'Service not found',
          message: 'The service you are looking for could not be found.'
        }
      });
    }

    const issue = await getIssue(id);
    if (!issue || issue.service_id !== serviceId) {
      console.log('Issue not found or does not belong to service');
      return res.status(404).render('error', {
        error: {
          title: 'Issue not found',
          message: 'The issue you are looking for could not be found.'
        }
      });
    }

    // Update issue status
    console.log('Updating issue status to open');
    await updateIssue(id, {
      status: 'open'
    });

    // Add reopen comment
    console.log('Creating reopen comment');
    await createComment({
      issue_id: id,
      user_id: user.id,
      content: comment,
      type: 'reopen'
    });
    console.log('Comment created successfully');

   
    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error reopening issue:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem reopening the issue.'
      }
    });
  }
}

/**
 * Assign an issue to a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function assignIssue(req, res) {
  try {
    const { serviceId, id } = req.params;
    const { assign_to, new_user_email, comment } = req.body;
    const user = req.session.user;

    // Validate input
    if (!assign_to && !new_user_email) {
      return res.redirect(`/services/${serviceId}/issues/${id}`);
    }

    // Get the issue to verify it exists and belongs to the user's department
    const issue = await getIssue(id);
    if (!issue) {
      return res.redirect(`/services/${serviceId}/issues/${id}`);
    }

    let assignedUserId = assign_to;
    let assignedUserEmail = new_user_email;

    // If assigning to a new user, create the user first
    if (new_user_email) {
      // Check if user already exists
      const existingUser = await db('users')
        .where('email', new_user_email)
        .first();

      if (existingUser) {
        assignedUserId = existingUser.id;
        assignedUserEmail = existingUser.email;
      } else {
        // Create new user
        const [newUser] = await db('users')
          .insert({
            email: new_user_email,
            role: 'department_user',
            department_id: user.department.id,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          })
          .returning('*');
        
        assignedUserId = newUser.id;
        assignedUserEmail = newUser.email;
      }
    } else {
      // Get the email of the existing user being assigned
      const assignedUser = await db('users')
        .where('id', assignedUserId)
        .select('email')
        .first();
      
      assignedUserEmail = assignedUser.email;
    }

    // Check if the assigned_to column exists
    const columnExists = await db.schema.hasColumn('issues', 'assigned_to');
    if (!columnExists) {
      // Add the column if it doesn't exist
      await db.schema.alterTable('issues', function(table) {
        table.uuid('assigned_to').nullable();
        table.foreign('assigned_to')
          .references('id')
          .inTable('users');
      });
    }

    // Update the issue with the assigned user
    await db('issues')
      .where('id', id)
      .update({
        assigned_to: assignedUserId,
        updated_at: db.fn.now()
      });

    // Add comment if provided
    if (comment) {
      await createComment({
        issue_id: id,
        user_id: user.id,
        content: comment
      });
    }

    // Send email notification
    const issueUrl = `${req.protocol}://${req.get('host')}/services/${serviceId}/issues/${id}`;
    
    await sendEmail(
      assignedUserEmail,
      process.env.GOVUK_NOTIFY_ISSUE_ASSIGNED_ID,
      {
        title: issue.title,
        description: issue.description,
        issueUrl: issueUrl,
        comments: comment || ''
      }
    );

    res.redirect(`/services/${serviceId}/issues/${id}`);
  } catch (error) {
    console.error('Error assigning issue:', error);
    res.redirect(`/services/${req.params.serviceId}/issues/${req.params.id}`);
  }
}

/**
 * Show closed issues
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showClosedIssues(req, res) {
  try {
    const { user } = req.session;
    const filters = {
      wcag_level: req.query.wcag_level || '',
      service_id: req.query.service_id || '',
      search: req.query.search || ''
    };

    let issues;
    if (user.role === 'super_admin') {
      issues = await getAllIssues();
    } else {
      // Get department ID from user's department object
      const departmentId = user.department?.id;
      if (!departmentId) {
        throw new Error('User department ID not found');
      }
      issues = await getDepartmentIssues(departmentId);
    }

    // Filter for closed issues
    issues = issues.filter(issue => issue.status === 'closed');

    // Apply filters
    if (filters.wcag_level) {
      const selectedLevels = Array.isArray(filters.wcag_level) ? filters.wcag_level : [filters.wcag_level];
      issues = issues.filter(issue => selectedLevels.includes(issue.wcag_level));
    }

    if (filters.service_id) {
      issues = issues.filter(issue => issue.service_id === filters.service_id);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      issues = issues.filter(issue => 
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.service_name?.toLowerCase().includes(searchTerm) ||
        issue.wcag_level?.toLowerCase().includes(searchTerm)
      );
    }

    // Get services for the department
    let services = [];
    if (user.role === 'super_admin') {
      services = await getAllServices();
    } else {
      services = await getDepartmentServices(user.department?.id);
    }

    res.render('department_admin/issues/closed', {
      issues,
      services,
      filters
    });
  } catch (error) {
    console.error('Error in closed issues view:', error);
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
    const filters = {
      wcag_level: req.query.wcag_level || '',
      service_id: req.query.service_id || '',
      search: req.query.search || ''
    };

    let issues;
    if (user.role === 'super_admin') {
      issues = await getAllIssues();
    } else {
      // Get department ID from user's department object
      const departmentId = user.department?.id;
      if (!departmentId) {
        throw new Error('User department ID not found');
      }
      issues = await getDepartmentIssues(departmentId);
    }

    // Filter for overdue issues
    const now = new Date();
    issues = issues.filter(issue => {
      return issue.status === 'open' && 
             issue.planned_fix_date && 
             new Date(issue.planned_fix_date) < now;
    });

    // Calculate days overdue for each issue
    issues = issues.map(issue => {
      const plannedFixDate = new Date(issue.planned_fix_date);
      const daysOverdue = Math.round((now - plannedFixDate) / (1000 * 60 * 60 * 24));
      return {
        ...issue,
        days_overdue: daysOverdue
      };
    });

    // Apply filters
    if (filters.wcag_level) {
      const selectedLevels = Array.isArray(filters.wcag_level) ? filters.wcag_level : [filters.wcag_level];
      issues = issues.filter(issue => selectedLevels.includes(issue.wcag_level));
    }

    if (filters.service_id) {
      issues = issues.filter(issue => issue.service_id === filters.service_id);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      issues = issues.filter(issue => 
        issue.title.toLowerCase().includes(searchTerm) ||
        issue.service_name?.toLowerCase().includes(searchTerm) ||
        issue.wcag_level?.toLowerCase().includes(searchTerm)
      );
    }

    // Get services for the department
    let services = [];
    if (user.role === 'super_admin') {
      services = await getAllServices();
    } else {
      services = await getDepartmentServices(user.department?.id);
    }

    res.render('department_admin/issues/overdue', {
      issues,
      services,
      filters
    });
  } catch (error) {
    console.error('Error in overdue issues view:', error);
    res.status(500).render('error', { error: 'Failed to load overdue issues' });
  }
}

module.exports = {
  index,
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
  issuesByCriterion,
  showClosedIssues,
  showOverdueIssues
}; 