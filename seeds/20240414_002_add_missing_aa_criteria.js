exports.seed = async function(knex) {
  // Insert only the missing AA criteria
  const missingCriteria = [
    { criterion: '1.4.10', title: 'Reflow', level: 'AA', version: '2.2' },
    { criterion: '1.4.11', title: 'Non-text Contrast', level: 'AA', version: '2.2' },
    { criterion: '1.4.12', title: 'Text Spacing', level: 'AA', version: '2.2' },
    { criterion: '1.4.13', title: 'Content on Hover or Focus', level: 'AA', version: '2.2' },
    { criterion: '2.4.11', title: 'Focus Not Obscured (Minimum)', level: 'AA', version: '2.2' },
    { criterion: '2.5.7', title: 'Dragging Movements', level: 'AA', version: '2.2' },
    { criterion: '2.5.8', title: 'Target Size (Minimum)', level: 'AA', version: '2.2' },
    { criterion: '3.2.6', title: 'Consistent Help', level: 'AA', version: '2.2' },
    { criterion: '3.3.7', title: 'Redundant Entry', level: 'AA', version: '2.2' },
    { criterion: '3.3.8', title: 'Accessible Authentication (Minimum)', level: 'AA', version: '2.2' }
  ];

  // Get existing criteria
  const existingCriteria = await knex('wcag_criteria').select('criterion');
  const existingCriterionNumbers = existingCriteria.map(c => c.criterion);

  // Filter out criteria that already exist
  const newCriteria = missingCriteria.filter(c => !existingCriterionNumbers.includes(c.criterion));

  // Insert only the new criteria
  if (newCriteria.length > 0) {
    await knex('wcag_criteria').insert(newCriteria);
  }
}; 