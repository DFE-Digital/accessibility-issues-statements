exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('services').del();
  
  // Inserts seed entries
  return knex('services').insert([
    {
      id: 1,
      department_id: 1,
      name: 'Find a Job',
      description: 'National job search and application service',
      url: 'https://findajob.dwp.gov.uk',
      external_id: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      department_id: 1,
      name: 'Universal Credit',
      description: 'Digital service for claiming and managing Universal Credit',
      url: 'https://www.gov.uk/universal-credit',
      external_id: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      department_id: 1,
      name: 'Child Maintenance Service',
      description: 'Service for arranging child maintenance payments',
      url: 'https://www.gov.uk/child-maintenance-service',
      external_id: null,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 