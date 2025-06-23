const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../data/users');
const { db } = require('../db');

const { sendEmail } = require('../middleware/notify');

/**
 * Show users for a department
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function index(req, res) {
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

        // Get the success message from session and clear it
        const successMessage = req.session.successMessage;
        delete req.session.successMessage;

        res.render('department_admin/users/index', {
            users,
            department: req.session.user.department,
            csrfToken: req.csrfToken(),
            data: {
                successMessage
            },
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the users page',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Show the new user form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showNewForm(req, res) {
    try {
        if (!req.session.user || req.session.user.role !== 'department_admin') {
            return res.redirect('/auth/sign-in');
        }

        const user = req.session.user;

        res.render('department_admin/users/new', {
            user,
            department: user.department,
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing new user form:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the form',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function create(req, res) {
    try {
        if (!req.session.user || req.session.user.role !== 'department_admin') {
            return res.redirect('/auth/sign-in');
        }

        const { first_name, last_name, email, role, send_notification } = req.body;
        const departmentId = req.session.user.department.id;

        // Check if email already exists
        const existingUser = await db('users')
            .where({ email: email.trim() })
            .first();

        if (existingUser) {
            return res.render('department_admin/users/new', {
                user: req.body,
                department: req.session.user.department,
                errors: {
                    email: 'A user with this email address already exists'
                },
                error: {
                    title: 'Error',
                    message: 'Failed to create user'
                },
                csrfToken: req.csrfToken(),
                user: req.session.user
            });
        }

        const userData = {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim(),
            role: role,
            departmentId: departmentId
        };

        const newUser = await createUser(userData);

        // Send notification email if requested
        if (send_notification === 'true') {
            try {
                await sendWelcomeEmail(newUser, req.session.user.department);
            } catch (emailError) {
                console.error('Error sending welcome email:', emailError);
                // Continue even if email fails
            }
        }

        // Set a message we can display on the users page, if checked send email say in the message

        req.session.successMessage = first_name + ' has been added. ' + (send_notification === 'true' ? 'We have also sent them an email to sign in.' : '');


        res.redirect('/users');
    } catch (error) {
        console.error('Error creating user:', error);
        res.render('department_admin/users/new', {
            user: req.body,
            department: req.session.user.department,
            errors: error.errors || {},
            error: {
                title: 'Error',
                message: 'Failed to create user'
            },
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    }
}

/**
 * Send welcome email to new user
 * @param {Object} user - The new user
 * @param {Object} department - The department
 */
async function sendWelcomeEmail(user, department) {
    const signInUrl = `${process.env.BASE_URL}/auth/sign-in`;
    const baseUrl = process.env.BASE_URL;

    const personalisation = {
        firstName: user.first_name,
        signInURL: signInUrl,
        baseURL: baseUrl
    };

    try {
        await sendEmail(
            user.email,
            process.env.GOVUK_NOTIFY_WELCOME_TEMPLATE_ID,
            personalisation
        );
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Log the specific error details
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        throw error;
    }
}

/**
 * Show the edit user form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function showEditForm(req, res) {
    try {
        if (!req.session.user || req.session.user.role !== 'department_admin') {
            return res.redirect('/auth/sign-in');
        }

        const { id } = req.params;
        const currentUser = req.session.user;

        // Get the user
        const user = await db('users')
            .where({ id, department_id: currentUser.department.id })
            .first();

        if (!user) {
            return res.status(404).render('error', {
                error: 'User not found'
            });
        }

        res.render('department_admin/users/edit', {
            user: currentUser,
            department: currentUser.department,
            editUser: user,
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing edit form:', error);
        res.status(500).render('error', {
            error: 'There was a problem loading the edit form',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Update a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function update(req, res) {
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

        const userData = {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim(),
            role: role
        };

        await updateUser(id, userData);
        res.redirect('/department-admin/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.render('department_admin/users/edit', {
            user: {...req.body, id: req.params.id },
            department: req.session.user.department,
            errors: error.errors || {},
            error: {
                title: 'Error',
                message: 'Failed to update user'
            },
            csrfToken: req.csrfToken(),
            user: req.session.user
        });
    }
}

/**
 * Delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function destroy(req, res) {
    try {
        if (!req.session.user || req.session.user.role !== 'department_admin') {
            return res.redirect('/auth/sign-in');
        }

        const { id } = req.params;
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

        await deleteUser(id);
        res.redirect('/department-admin/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).render('error', {
            error: 'There was a problem deleting the user',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

const superAdminIndex = async(req, res) => {
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
            user: req.session.user,
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
    showNewForm,
    create,
    showEditForm,
    update,
    destroy
};