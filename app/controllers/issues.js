const { getServiceIssues, getIssue, createIssue: createIssueData, updateIssue: updateIssueData } = require('../data/issues');
const { getDepartmentServices, getService } = require('../data/services');
const { createComment, getIssueComments, deleteComment } = require('../data/comments');
const { getWcagCriteria } = require('../data/wcag_criteria');

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

    // Get the WCAG criterion to determine risk level
    const wcag_criteria = await getWcagCriteria();
    const selectedCriterion = wcag_criteria.find(c => c.criterion === req.body.wcag_criterion);
    
    if (!selectedCriterion) {
      return res.status(400).render('error', {
        error: {
          title: 'Invalid WCAG criterion',
          message: 'The selected WCAG criterion could not be found.'
        }
      });
    }

    // Set risk level based on WCAG level
    let risk_level;
    switch (selectedCriterion.level) {
      case 'A':
        risk_level = 'high';
        break;
      case 'AA':
        risk_level = 'medium';
        break;
      case 'AAA':
      case 'Best practice':
        risk_level = 'low';
        break;
      default:
        risk_level = 'low';
    }

    const issueData = {
      service_id: serviceId,
      title: req.body.title,
      description: req.body.description,
      risk_level: risk_level,
      wcag_criteria: req.body.wcag_criterion,
      wcag_criterion: req.body.wcag_criterion,
      source_of_discovery: req.body.source_of_discovery,
      status: 'open',
      created_by: user.id,
      planned_fix: req.body.planned_fix === 'true',
      planned_fix_date: req.body.planned_fix === 'true' ? `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` : null,
      not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
    };

    await createIssueData(issueData);

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

    res.render('services/department_admin/issues/show', {
      service,
      issue
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

    const issueData = {
      title: req.body.title,
      description: req.body.description,
      risk_level: req.body.risk_level,
      wcag_criteria: req.body.wcag_criterion,
      wcag_criterion: req.body.wcag_criterion,
      wcag_level: req.body.wcag_level,
      source_of_discovery: req.body.source_of_discovery,
      status: req.body.status,
      planned_fix: req.body.planned_fix === 'true',
      planned_fix_date: req.body.planned_fix === 'true' ? `${req.body.planned_fix_date_year}-${req.body.planned_fix_date_month}-${req.body.planned_fix_date_day}` : null,
      not_fixing_reason: req.body.planned_fix === 'false' ? req.body.not_fixing_reason : null
    };

    await updateIssueData(id, issueData);

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

    // Update issue status
    await updateIssueData(id, {
      status: 'closed'
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
    await updateIssueData(id, {
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

module.exports = {
  showNewIssueForm,
  handleCreateIssue,
  showIssueDetails,
  showEditIssueForm,
  handleUpdateIssue,
  addComment,
  handleDeleteComment,
  handleCloseIssue,
  handleReopenIssue
}; 