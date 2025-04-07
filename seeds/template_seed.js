/**
 * Template seed file showing how to structure department data
 */
exports.seed = async function(knex) {
  // Clean all tables in correct order
  await knex('comments').del();
  await knex('issues').del();
  await knex('services').del();
  await knex('users').del();
  await knex('department_allowed_domains').del();
  await knex('departments').del();

  // Insert department
  const deptResult = await knex('departments')
    .insert({
      name: 'Department Name'
    })
    .returning('*');
  const departmentId = deptResult[0].id;

  // Insert allowed domains
  await knex('department_allowed_domains')
    .insert({
      department_id: departmentId,
      domain: '@department.gov.uk'
    });

  // Insert users with different roles
  const superAdminResult = await knex('users')
    .insert({
      email: 'super.admin@department.gov.uk',
      role: 'super_admin',
      department_id: departmentId
    })
    .returning('*');
  const superAdminId = superAdminResult[0].id;

  const deptAdminResult = await knex('users')
    .insert({
      email: 'dept.admin@department.gov.uk',
      role: 'department_admin',
      department_id: departmentId
    })
    .returning('*');
  const deptAdminId = deptAdminResult[0].id;

  const serviceOwnerResult = await knex('users')
    .insert({
      email: 'service.owner@department.gov.uk',
      role: 'service_owner',
      department_id: departmentId
    })
    .returning('*');
  const serviceOwnerId = serviceOwnerResult[0].id;

  const regularUserResult = await knex('users')
    .insert({
      email: 'user@department.gov.uk',
      role: 'user',
      department_id: departmentId
    })
    .returning('*');
  const regularUserId = regularUserResult[0].id;

  // Insert service
  const serviceResult = await knex('services')
    .insert({
      department_id: departmentId,
      name: 'Example Service',
      url: 'https://example.service.gov.uk',
      service_owner_id: serviceOwnerId
    })
    .returning('*');
  const serviceId = serviceResult[0].id;

  // Insert example issue
  const issueResult = await knex('issues')
    .insert({
      service_id: serviceId,
      title: 'Example Accessibility Issue',
      description: 'Description of the accessibility issue',
      status: 'open',
      risk_level: 'medium',
      wcag_criteria: 'WCAG 2.1 A 1.1.1',
      source_of_discovery: 'Internal Review',
      created_by: regularUserId
    })
    .returning('*');
  const issueId = issueResult[0].id;

  // Insert example comment
  await knex('comments')
    .insert({
      issue_id: issueId,
      user_id: serviceOwnerId,
      content: 'Example comment on the issue'
    });

  // Insert example audit log
  await knex('audit_logs')
    .insert({
      action_type: 'create',
      user_id: regularUserId,
      department_id: departmentId,
      entity_type: 'issue',
      entity_id: issueId,
      changes: JSON.stringify({
        type: 'create',
        new_values: {
          title: 'Example Accessibility Issue',
          status: 'open'
        }
      })
    });
}; 