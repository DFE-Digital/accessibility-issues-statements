const { db } = require('../db');

const index = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    // Get departments with service counts and admin counts
    const departments = await db('departments')
      .select(
        'departments.id',
        'departments.name',
        'departments.created_at',
        db.raw('COUNT(DISTINCT services.id) as services_count'),
        db.raw('COUNT(DISTINCT CASE WHEN users.role = \'department_admin\' THEN users.id END) as admins_count'),
        db.raw('COUNT(DISTINCT department_allowed_domains.id) as domains_count')
      )
      .leftJoin('services', 'departments.id', 'services.department_id')
      .leftJoin('users', function() {
        this.on('departments.id', '=', 'users.department_id')
            .andOn('users.role', '=', db.raw('\'department_admin\''));
      })
      .leftJoin('department_allowed_domains', 'departments.id', 'department_allowed_domains.department_id')
      .groupBy(
        'departments.id',
        'departments.name',
        'departments.created_at'
      )
      .orderBy('departments.name');

    // Get domains for each department
    const domainsPromises = departments.map(dept =>
      db('department_allowed_domains')
        .select('domain')
        .where('department_id', dept.id)
        .orderBy('domain')
    );

    // Get admins for each department where the role is department_admin
    const adminsPromises = departments.map(dept =>
      db('users')
        .select('id', 'first_name', 'last_name', 'email')
        .where('department_id', dept.id)
        .where('role', 'department_admin')
        .orderBy('first_name')
    );

    const adminsResults = await Promise.all(adminsPromises);

    const domainsResults = await Promise.all(domainsPromises);

    // Combine the results
    const departmentsWithDetails = departments.map((dept, index) => ({
      ...dept,
      domains: domainsResults[index].map(d => d.domain).join(', ')
    }));

    // Combine the admins with the departments
    const departmentsWithAdmins = departmentsWithDetails.map((dept, index) => ({
      ...dept,
      admins: adminsResults[index]
    }));

    res.render('departments/index', {
      departments: departmentsWithAdmins,
      user: req.session.user,
      successMessage: req.session.successMessage,

    });
    delete req.session.successMessage;
  } catch (error) {
    console.error('Departments error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the departments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showNewForm = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    res.render('departments/new', {
      user: req.session.user
    });
  } catch (error) {
    console.error('New department form error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the form',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const create = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { name, domains } = req.body;

    // Start a transaction
    await db.transaction(async (trx) => {
      // Create the department
      const [department] = await trx('departments')
        .insert({
          name,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Add domains if provided
      if (domains) {
        const domainList = domains.split(',').map(d => d.trim()).filter(d => d);
        if (domainList.length > 0) {
          await trx('department_allowed_domains')
            .insert(
              domainList.map(domain => ({
                department_id: department.id,
                domain,
                created_at: new Date(),
                updated_at: new Date()
              }))
            );
        }
      }
    });

    req.session.successMessage = 'Department created successfully';
    res.redirect('/departments');
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).render('error', {
      error: 'There was a problem creating the department',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showEditForm = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;

    // Get department and its admins
    const department = await db('departments')
      .select('departments.*')
      .where('departments.id', id)
      .first();

    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }

    // Get current admins
    const admins = await db('users')
      .select('id', 'first_name', 'last_name', 'email')
      .where({
        department_id: id,
        role: 'department_admin'
      })
      .orderBy('first_name');

    // Get allowed domains
    const allowedDomains = await db('department_allowed_domains')
      .select('id', 'domain')
      .where('department_id', id)
      .orderBy('domain');

    res.render('departments/edit', {
      department,
      admins,
      allowedDomains,
      user: req.session.user
    });
  } catch (error) {
    console.error('Edit department error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the department',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;
    const { name, domains } = req.body;

    // Start a transaction
    await db.transaction(async (trx) => {
      // Update department name
      await trx('departments')
        .where('id', id)
        .update({
          name,
          updated_at: new Date()
        });

      // Delete existing domains
      await trx('department_allowed_domains')
        .where('department_id', id)
        .delete();

      // Add new domains if provided
      if (domains) {
        const domainList = domains.split(',').map(d => d.trim()).filter(d => d);
        if (domainList.length > 0) {
          await trx('department_allowed_domains')
            .insert(
              domainList.map(domain => ({
                department_id: id,
                domain,
                created_at: new Date(),
                updated_at: new Date()
              }))
            );
        }
      }
    });

    req.session.successMessage = 'Department updated successfully';
    res.redirect('/departments');
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).render('error', {
      error: 'There was a problem updating the department',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const remove = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    const { id } = req.params;

    // Check if department has any services
    const servicesCount = await db('services')
      .where('department_id', id)
      .count('* as count')
      .first();

    if (servicesCount.count > 0) {
      return res.status(400).render('error', {
        error: 'Cannot delete department with associated services'
      });
    }

    // Start a transaction
    await db.transaction(async (trx) => {
      // Delete department admins
      await trx('users')
        .where({
          department_id: id,
          role: 'department_admin'
        })
        .delete();

      // Delete allowed domains
      await trx('department_allowed_domains')
        .where('department_id', id)
        .delete();

      // Delete the department
      await trx('departments')
        .where('id', id)
        .delete();
    });

    req.session.successMessage = 'Department deleted successfully';
    res.redirect('/departments');
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).render('error', {
      error: 'There was a problem deleting the department',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

async function showNewAdminForm(req, res) {
  const departmentId = req.params.id;
  
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    const department = await db('departments')
      .where('id', departmentId)
      .first();
    
    if (!department) {
      return res.status(404).render('error', {
        error: 'Department not found'
      });
    }
    
    res.render('departments/new_admin', {
      department,
      email: '',
      first_name: '',
      last_name: '',
      error: null,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.redirect('/departments');
  }
}

async function addAdmin(req, res) {
  const departmentId = req.params.id;
  const { email, first_name, last_name } = req.body;
  
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.redirect('/auth/sign-in');
    }

    // Start a transaction
    await db.transaction(async (trx) => {
      // Check if user already exists
      const existingUser = await trx('users')
        .where('email', email)
        .first();
      
      if (existingUser) {
        if (existingUser.departmentid === departmentId && existingUser.role === 'department_admin') {
          throw new Error('This user is already an admin of this department');
        }

        // Update existing user to be a department admin
        await trx('users')
          .where('id', existingUser.id)
          .update({
            department_id: departmentId,
            role: 'department_admin',
            updated_at: new Date()
          });
      } else {
        // Create new user
        await trx('users')
          .insert({
            email,
            first_name,
            last_name,
            role: 'department_admin',
            department_id: departmentId,
            created_at: new Date(),
            updated_at: new Date()
          });
      }
    });
    
    req.session.successMessage = 'Department admin added successfully';
    res.redirect(`/departments/${departmentId}/edit`);
  } catch (error) {
    console.error('Error adding department admin:', error);
    
    const department = await db('departments')
      .where('id', departmentId)
      .first();
    
    res.render('departments/new_admin', {
      department,
      email,
      first_name,
      last_name,
      error: error.message,
      user: req.session.user
    });
  }
}

async function removeAdmin(req, res) {
  const { id: departmentId, adminId } = req.params;
  
  try {
    // Update the user's role to 'user' instead of deleting them
    await db('users')
      .where({
        id: adminId,
        department_id: departmentId
      })
      .update({
        role: 'user'
      });
    
    req.session.successMessage = 'Department admin removed successfully';
    res.redirect(`/departments/${departmentId}/edit`);
  } catch (error) {
    console.error('Error removing department admin:', error);
    req.session.errorMessage = 'Error removing department admin';
    res.redirect(`/departments/${departmentId}/edit`);
  }
}

module.exports = {
  index,
  showNewForm,
  create,
  showEditForm,
  update,
  remove,
  showNewAdminForm,
  addAdmin,
  removeAdmin
}; 