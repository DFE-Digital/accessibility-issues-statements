const { db } = require('../db');
const { getWcagCriteria, createWcagCriterion, updateWcagCriterion, deleteWcagCriterion } = require('../data/wcag_criteria');

/**
 * Show the WCAG criteria management page
 */
const index = async (req, res) => {
  try {
    const criteria = await getWcagCriteria();
    res.render('super_admin/wcag/index', {
      criteria,
      csrfToken: req.csrfToken(),
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (error) {
    console.error('Error loading WCAG criteria:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the WCAG criteria',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Show the form to create a new WCAG criterion
 */
const showNewForm = (req, res) => {
  res.render('super_admin/wcag/new', {
    csrfToken: req.csrfToken(),
    errorMessage: req.query.error
  });
};

/**
 * Create a new WCAG criterion
 */
const create = async (req, res) => {
  try {
    const { criterion, title, level, version, description, guidance_url } = req.body;
    
    await createWcagCriterion({
      criterion,
      title,
      level,
      version,
      description,
      guidance_url
    });

    res.redirect('/super-admin/wcag?success=WCAG criterion created successfully');
  } catch (error) {
    console.error('Error creating WCAG criterion:', error);
    res.redirect('/super-admin/wcag/new?error=There was a problem creating the WCAG criterion');
  }
};

/**
 * Show the form to edit a WCAG criterion
 */
const showEditForm = async (req, res) => {
  try {
    const { id } = req.params;
    const criterion = await db('wcag_criteria').where({ id }).first();
    
    if (!criterion) {
      return res.status(404).render('error', {
        error: 'WCAG criterion not found'
      });
    }

    res.render('super_admin/wcag/edit', {
      criterion,
      csrfToken: req.csrfToken(),
      errorMessage: req.query.error
    });
  } catch (error) {
    console.error('Error loading WCAG criterion:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the WCAG criterion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a WCAG criterion
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { criterion, title, level, version, description, guidance_url } = req.body;
    
    await updateWcagCriterion(id, {
      criterion,
      title,
      level,
      version,
      description,
      guidance_url
    });

    res.redirect('/super-admin/wcag?success=WCAG criterion updated successfully');
  } catch (error) {
    console.error('Error updating WCAG criterion:', error);
    res.redirect(`/super-admin/wcag/${req.params.id}/edit?error=There was a problem updating the WCAG criterion`);
  }
};

/**
 * Delete a WCAG criterion
 */
const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteWcagCriterion(id);
    
    res.redirect('/super-admin/wcag?success=WCAG criterion deleted successfully');
  } catch (error) {
    console.error('Error deleting WCAG criterion:', error);
    res.redirect('/super-admin/wcag?error=There was a problem deleting the WCAG criterion');
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