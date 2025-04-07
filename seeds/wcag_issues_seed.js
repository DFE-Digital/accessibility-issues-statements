exports.seed = async function(knex) {
  // Get the first service to attach issues to
  const service = await knex('services').first();
  const serviceId = service.id;

  // Get the first user to set as creator
  const user = await knex('users').first();
  const userId = user.id;

  // Common WCAG issues
  const issues = [
    {
      title: 'Missing image alternative text',
      description: 'Several images on the service lack appropriate alternative text, making them inaccessible to screen reader users.',
      status: 'open',
      risk_level: 'high',
      wcag_criteria: 'WCAG 2.1 A 1.1.1 Non-text Content',
      source_of_discovery: 'Automated Testing',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Insufficient color contrast',
      description: 'The text color in the navigation menu does not meet minimum contrast requirements against the background color.',
      status: 'in_progress',
      risk_level: 'medium',
      wcag_criteria: 'WCAG 2.1 AA 1.4.3 Contrast (Minimum)',
      source_of_discovery: 'Manual Testing',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Keyboard navigation issues',
      description: 'Some interactive elements cannot be accessed or operated using keyboard navigation alone.',
      status: 'open',
      risk_level: 'high',
      wcag_criteria: 'WCAG 2.1 A 2.1.1 Keyboard',
      source_of_discovery: 'User Feedback',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Missing form labels',
      description: 'Form fields in the registration process lack properly associated labels.',
      status: 'open',
      risk_level: 'medium',
      wcag_criteria: 'WCAG 2.1 A 3.3.2 Labels or Instructions',
      source_of_discovery: 'Internal Audit',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'No skip navigation link',
      description: 'The service lacks a skip navigation link, making it difficult for keyboard users to bypass repetitive content.',
      status: 'in_progress',
      risk_level: 'low',
      wcag_criteria: 'WCAG 2.1 A 2.4.1 Bypass Blocks',
      source_of_discovery: 'Accessibility Audit',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Heading structure issues',
      description: 'The page contains heading levels that are skipped or not properly nested, affecting the document outline.',
      status: 'open',
      risk_level: 'medium',
      wcag_criteria: 'WCAG 2.1 AAA 2.4.10 Section Headings',
      source_of_discovery: 'Manual Testing',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Missing language declaration',
      description: 'The HTML lang attribute is not set, making it difficult for screen readers to determine the correct pronunciation.',
      status: 'resolved',
      risk_level: 'low',
      wcag_criteria: 'WCAG 2.1 A 3.1.1 Language of Page',
      source_of_discovery: 'Automated Testing',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Non-descriptive link text',
      description: 'Multiple links use generic text like "click here" or "read more" without proper context.',
      status: 'open',
      risk_level: 'medium',
      wcag_criteria: 'WCAG 2.1 A 2.4.4 Link Purpose (In Context)',
      source_of_discovery: 'User Testing',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'Missing ARIA landmarks',
      description: 'The page structure lacks proper ARIA landmarks to identify different sections of content.',
      status: 'in_progress',
      risk_level: 'low',
      wcag_criteria: 'WCAG 2.1 A 1.3.1 Info and Relationships',
      source_of_discovery: 'Internal Review',
      service_id: serviceId,
      created_by: userId
    },
    {
      title: 'No visible focus indicators',
      description: 'Interactive elements lack visible focus indicators when navigating with a keyboard.',
      status: 'open',
      risk_level: 'high',
      wcag_criteria: 'WCAG 2.1 AA 2.4.7 Focus Visible',
      source_of_discovery: 'Accessibility Audit',
      service_id: serviceId,
      created_by: userId
    }
  ];

  // Insert all issues
  await knex('issues').insert(issues);
}; 