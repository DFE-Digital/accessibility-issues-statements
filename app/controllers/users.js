const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../data/users');

/**
 * Show users for a department
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showDepartmentUsers(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const users = await getUsers(user.department.id);

    res.render('services/department_admin/users/index', {
      department: user.department,
      users,
      user
    });
  } catch (error) {
    console.error('Error showing users:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the users.'
      }
    });
  }
}

/**
 * Show the new user form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showNewUserForm(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    res.render('services/department_admin/users/new', {
      department: user.department,
      user: {}
    });
  } catch (error) {
    console.error('Error showing new user form:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the form.'
      }
    });
  }
}

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCreateUser(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const userData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      role: 'user',
      departmentId: user.department.id
    };

    await createUser(userData);
    res.redirect('/services/department-admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    res.render('services/department_admin/users/new', {
      department: req.session.user.department,
      user: req.body,
      errors: error.errors || {},
      error: {
        title: 'Error',
        message: 'Failed to create user'
      }
    });
  }
}

/**
 * Show the edit user form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showEditUserForm(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const user = req.session.user;
    const editUser = await getUserById(id);
    
    if (!editUser || editUser.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: {
          title: 'Not found',
          message: 'User not found'
        }
      });
    }

    res.render('services/department_admin/users/edit', {
      department: user.department,
      user: editUser
    });
  } catch (error) {
    console.error('Error showing edit user form:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'There was a problem loading the form.'
      }
    });
  }
}

/**
 * Update a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleUpdateUser(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const user = req.session.user;
    const editUser = await getUserById(id);
    
    if (!editUser || editUser.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: {
          title: 'Not found',
          message: 'User not found'
        }
      });
    }

    const userData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      role: 'user'
    };

    await updateUser(id, userData);
    res.redirect('/services/department-admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.render('services/department_admin/users/edit', {
      department: req.session.user.department,
      user: { ...req.body, id: req.params.id },
      errors: error.errors || {},
      error: {
        title: 'Error',
        message: 'Failed to update user'
      }
    });
  }
}

/**
 * Delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleDeleteUser(req, res) {
  try {
    // Check authentication
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const user = req.session.user;
    const deleteUser = await getUserById(id);
    
    if (!deleteUser || deleteUser.department_id !== user.department.id) {
      return res.status(404).render('error', {
        error: {
          title: 'Not found',
          message: 'User not found'
        }
      });
    }

    await deleteUser(id);
    res.redirect('/services/department-admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).render('error', {
      error: {
        title: 'Error',
        message: 'Failed to delete user'
      }
    });
  }
}

module.exports = {
  index: showDepartmentUsers,
  showNewForm: showNewUserForm,
  create: handleCreateUser,
  showEditForm: showEditUserForm,
  update: handleUpdateUser,
  destroy: handleDeleteUser
}; 