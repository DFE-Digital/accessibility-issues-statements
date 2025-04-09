const businessAreasData = require('../data/business_areas');

/**
 * Show business areas for a department
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const businessAreas = await businessAreasData.getDepartmentBusinessAreas(user.department.id);

    res.render('department_admin/business_areas/index', {
      businessAreas,
      user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Business areas error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the business areas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show new business area form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showNewForm = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    res.render('department_admin/business_areas/new', {
      user: req.session.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('New business area form error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the new business area form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new business area
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const create = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const { name } = req.body;

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = { name };

    if (!name || name.trim() === '') {
      const message = 'Enter a business area name';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    } else if (name.length > 255) {
      const message = 'Business area name must be 255 characters or less';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    }

    if (errorSummary.length > 0) {
      return res.render('department_admin/business_areas/new', {
        user,
        errors: errorSummary,
        fieldErrors,
        values,
        csrfToken: req.csrfToken()
      });
    }

    await businessAreasData.createBusinessArea({
      name: name.trim(),
      departmentId: user.department.id
    });

    res.redirect('/business-areas');
  } catch (error) {
    console.error('Create business area error:', error);
    res.status(500).render('error', {
      error: 'There was a problem creating the business area',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show edit business area form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditForm = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const { id } = req.params;

    const businessArea = await businessAreasData.getBusinessArea(id);

    if (!businessArea || businessArea.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: 'Business area not found'
      });
    }

    res.render('department_admin/business_areas/edit', {
      businessArea,
      user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Edit business area form error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the edit business area form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a business area
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const update = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const { id } = req.params;
    const { name } = req.body;

    const businessArea = await businessAreasData.getBusinessArea(id);

    if (!businessArea || businessArea.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: 'Business area not found'
      });
    }

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = { name };

    if (!name || name.trim() === '') {
      const message = 'Enter a business area name';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    } else if (name.length > 255) {
      const message = 'Business area name must be 255 characters or less';
      errorSummary.push({ field: 'name', message });
      fieldErrors.name = message;
    }

    if (errorSummary.length > 0) {
      return res.render('department_admin/business_areas/edit', {
        businessArea,
        user,
        errors: errorSummary,
        fieldErrors,
        values,
        csrfToken: req.csrfToken()
      });
    }

    await businessAreasData.updateBusinessArea(id, {
      name: name.trim()
    });

    res.redirect('/business-areas');
  } catch (error) {
    console.error('Update business area error:', error);
    res.status(500).render('error', {
      error: 'There was a problem updating the business area',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a business area
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const destroy = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const { id } = req.params;

    const businessArea = await businessAreasData.getBusinessArea(id);

    if (!businessArea || businessArea.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: 'Business area not found'
      });
    }

    await businessAreasData.deleteBusinessArea(id);

    res.redirect('/business-areas');
  } catch (error) {
    console.error('Delete business area error:', error);
    res.status(500).render('error', {
      error: 'There was a problem deleting the business area',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  index,
  showNewForm,
  create,
  showEditForm,
  update,
  destroy
}; 