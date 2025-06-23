/**
 * Seed file for Department for Education data
 */
exports.seed = async function(knex) {

    // Set up the values to be used in the seed
    const departmentName = '';
    const superAdminEmail = '';
    const superAdminFirstName = '';
    const superAdminLastName = '';
    const departmentAdminEmail = '';
    const departmentAdminFirstName = '';
    const departmentAdminLastName = '';

    // Super admin can manage the department and all users and the statement templates (make this generic or a team email)
    // Department admin can manage users and services (make this a person - you can add more later in the interface)


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
            name: departmentName
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
            email: superAdminEmail,
            role: 'super_admin',
            first_name: superAdminFirstName,
            last_name: superAdminLastName,
            department_id: dfeId
        })
        .returning('*');

    // Insert department admin
    const departmentAdminResult = await knex('users')
        .insert({
            email: departmentAdminEmail,
            role: 'department_admin',
            first_name: departmentAdminFirstName,
            last_name: departmentAdminLastName,
            department_id: dfeId
        })
        .returning('*');
};