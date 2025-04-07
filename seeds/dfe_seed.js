/**
 * Seed file for Department for Education data
 */
exports.seed = async function(knex) {
  // Clean all tables in correct order
  await knex('comments').del();
  await knex('issues').del();
  await knex('services').del();
  await knex('users').del();
  await knex('department_allowed_domains').del();
  await knex('departments').del();

  // Insert DfE and get its ID
  const dfeResult = await knex('departments')
    .insert({
      name: 'Department for Education'
    })
    .returning('*');
  const dfeId = dfeResult[0].id;

  // Insert allowed domain
  await knex('department_allowed_domains')
    .insert({
      department_id: dfeId,
      domain: '@education.gov.uk'
    });

  // Insert super admin
  const superAdminResult = await knex('users')
    .insert({
      email: 'design.ops@education.gov.uk',
      role: 'super_admin',
      department_id: dfeId
    })
    .returning('*');
  const superAdminId = superAdminResult[0].id;

  // Insert department admins
  const jakeResult = await knex('users')
    .insert({
      email: 'jake.lloyd@education.gov.uk',
      role: 'department_admin',
      department_id: dfeId
    })
    .returning('*');
  const jakeId = jakeResult[0].id;

  const andyResult = await knex('users')
    .insert({
      email: 'andy.jones@education.gov.uk',
      role: 'department_admin',
      department_id: dfeId
    })
    .returning('*');
  const andyId = andyResult[0].id;

  // Insert regular users
  const kerryResult = await knex('users')
    .insert({
      email: 'kerry.lyons@education.gov.uk',
      role: 'user',
      department_id: dfeId
    })
    .returning('*');
  const kerryId = kerryResult[0].id;

  const adamResult = await knex('users')
    .insert({
      email: 'adam.dumbell@education.gov.uk',
      role: 'user',
      department_id: dfeId
    })
    .returning('*');
  const adamId = adamResult[0].id;

  // Insert Design Manual service
  const designManualResult = await knex('services')
    .insert({
      department_id: dfeId,
      name: 'Design Manual',
      url: 'https://design.education.gov.uk',
      service_owner_id: andyId
    })
    .returning('*');
  const designManualId = designManualResult[0].id;

  // Create an example issue to start with
  const issueResult = await knex('issues')
    .insert({
      service_id: designManualId,
      title: 'Initial accessibility review needed',
      description: 'We should conduct an initial accessibility review of the Design Manual to establish our baseline.',
      status: 'open',
      risk_level: 'medium',
      wcag_criteria: 'General Review',
      source_of_discovery: 'Internal Planning',
      created_by: jakeId
    })
    .returning('*');
  const issueId = issueResult[0].id;

  // Add a comment from the service owner
  await knex('comments')
    .insert({
      issue_id: issueId,
      user_id: andyId,
      content: 'I agree. Let\'s schedule this for next sprint.'
    });

  // Add audit log for the issue creation
  await knex('audit_logs')
    .insert({
      action_type: 'create',
      user_id: jakeId,
      department_id: dfeId,
      entity_type: 'issue',
      entity_id: issueId,
      changes: JSON.stringify({
        type: 'create',
        new_values: {
          title: 'Initial accessibility review needed',
          status: 'open'
        }
      })
    });
}; 