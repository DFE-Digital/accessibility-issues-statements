exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('services').del();
  
  // Inserts seed entries
  return knex('services').insert([
    {
      id: 1,
      department_id: 1,
      name: 'Service 1',
      description: 'Description for Service 1',
      url: 'https://service1.example.com',
      external_id: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      department_id: 1,
      name: 'Service 2',
      description: 'Description for Service 2',
      url: 'https://service2.example.com',
      external_id: null,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 