const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../data/users');
const { db } = require('../db');

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



    res.render('users/edit', {
      department: user.department,
      user,
      editUser: editUser
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

    // Delete the user using the database directly
    await db('users')
      .where({ id })
      .del();

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

const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const departmentId = req.session.user.department.id;

    // Get all users in the department
    const users = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.role',
        'users.created_at',
        'users.updated_at',
        'users.last_login'
      )
      .where('users.department_id', departmentId)
      .orderBy('users.first_name');
      

    res.render('department_admin/users/index', {
      users,
      department: req.session.user.department,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the users page',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showEditForm = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const departmentId = req.session.user.department.id;

    // Get the user
    const user = await db('users')
      .where({ id, department_id: departmentId })
      .first();

    if (!user) {
      return res.status(404).render('error', {
        error: 'User not found'
      });
    }

    res.render('department_admin/users/edit', {
      editUser: user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error showing edit form:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the edit form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const { first_name, last_name, email, role } = req.body;
    const departmentId = req.session.user.department.id;

    // Validate the user belongs to the department
    const user = await db('users')
      .where({ id, department_id: departmentId })
      .first();

    if (!user) {
      return res.status(404).render('error', {
        error: 'User not found'
      });
    }

    // Update the user
    await db('users')
      .where({ id })
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        role: role,
        updated_at: new Date()
      });

    res.redirect('/department_admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).render('error', {
      error: 'There was a problem updating the user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const destroy = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'department_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const departmentId = req.session.user.department.id;

    // Validate the user belongs to the department and has no name
    const user = await db('users')
      .where({ id, department_id: departmentId })
      .first();

    if (!user) {
      return res.status(404).render('error', {
        error: 'User not found'
      });
    }

    if (user.first_name || user.last_name) {
      return res.status(400).render('error', {
        error: 'Cannot delete user with name'
      });
    }

    // Delete the user
    await db('users')
      .where({ id })
      .del();

    res.redirect('/department_admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).render('error', {
      error: 'There was a problem deleting the user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const superAdminIndex = async (req, res) => {
  try {
    // Get all users across all departments
    const users = await db('users')
      .select(
        'users.*',
        'departments.name as department_name'
      )
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .orderBy('users.first_name');

    // Get all departments for the filter dropdown
    const departments = await db('departments')
      .select('id', 'name')
      .orderBy('name');

    res.render('super_admin/users/index', {
      users,
      departments,
      currentUserId: req.session.user.id,
      title: 'Manage Users',
      serviceNavigation: false
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.redirect('/');
  }
};

module.exports = {
  index,
  superAdminIndex,
  showEditForm,
  update,
  destroy,
  showNewForm: showNewUserForm,
  create: handleCreateUser,
  showEditForm: showEditUserForm,
  destroy: handleDeleteUser
}; 