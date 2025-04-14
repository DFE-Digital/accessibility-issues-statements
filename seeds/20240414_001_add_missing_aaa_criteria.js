exports.seed = async function(knex) {
  // Insert only the missing AAA criteria
  const missingCriteria = [
    { criterion: '1.2.6', title: 'Sign Language (Prerecorded)', level: 'AAA', version: '2.2' },
    { criterion: '1.2.7', title: 'Extended Audio Description (Prerecorded)', level: 'AAA', version: '2.2' },
    { criterion: '1.2.8', title: 'Media Alternative (Prerecorded)', level: 'AAA', version: '2.2' },
    { criterion: '1.2.9', title: 'Audio-only (Live)', level: 'AAA', version: '2.2' },
    { criterion: '1.3.6', title: 'Identify Purpose', level: 'AAA', version: '2.2' },
    { criterion: '1.4.6', title: 'Contrast (Enhanced)', level: 'AAA', version: '2.2' },
    { criterion: '1.4.7', title: 'Low or No Background Audio', level: 'AAA', version: '2.2' },
    { criterion: '1.4.8', title: 'Visual Presentation', level: 'AAA', version: '2.2' },
    { criterion: '1.4.9', title: 'Images of Text (No Exception)', level: 'AAA', version: '2.2' },
    { criterion: '2.1.3', title: 'Keyboard (No Exception)', level: 'AAA', version: '2.2' },
    { criterion: '2.2.3', title: 'No Timing', level: 'AAA', version: '2.2' },
    { criterion: '2.2.4', title: 'Interruptions', level: 'AAA', version: '2.2' },
    { criterion: '2.2.5', title: 'Re-authenticating', level: 'AAA', version: '2.2' },
    { criterion: '2.2.6', title: 'Timeouts', level: 'AAA', version: '2.2' },
    { criterion: '2.3.2', title: 'Three Flashes', level: 'AAA', version: '2.2' },
    { criterion: '2.3.3', title: 'Animation from Interactions', level: 'AAA', version: '2.2' },
    { criterion: '2.4.8', title: 'Location', level: 'AAA', version: '2.2' },
    { criterion: '2.4.9', title: 'Link Purpose (Link Only)', level: 'AAA', version: '2.2' },
    { criterion: '2.4.10', title: 'Section Headings', level: 'AAA', version: '2.2' },
    { criterion: '2.4.12', title: 'Focus Not Obscured (Enhanced)', level: 'AAA', version: '2.2' },
    { criterion: '2.4.13', title: 'Focus Appearance', level: 'AAA', version: '2.2' },
    { criterion: '2.5.6', title: 'Concurrent Input Mechanisms', level: 'AAA', version: '2.2' },
    { criterion: '3.1.3', title: 'Unusual Words', level: 'AAA', version: '2.2' },
    { criterion: '3.1.4', title: 'Abbreviations', level: 'AAA', version: '2.2' },
    { criterion: '3.1.5', title: 'Reading Level', level: 'AAA', version: '2.2' },
    { criterion: '3.1.6', title: 'Pronunciation', level: 'AAA', version: '2.2' },
    { criterion: '3.2.5', title: 'Change on Request', level: 'AAA', version: '2.2' },
    { criterion: '3.3.5', title: 'Help', level: 'AAA', version: '2.2' },
    { criterion: '3.3.6', title: 'Error Prevention (All)', level: 'AAA', version: '2.2' },
    { criterion: '3.3.9', title: 'Accessible Authentication (Enhanced)', level: 'AAA', version: '2.2' }
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