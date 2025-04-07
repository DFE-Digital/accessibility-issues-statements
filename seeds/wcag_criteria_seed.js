exports.seed = async function(knex) {
  // First, delete existing entries
  await knex('wcag_criteria').del();

  // Insert WCAG criteria
  const criteria = [
    // Perceivable
    { criterion: '1.1.1', title: 'Non-text Content', level: 'A', version: '2.2' },
    { criterion: '1.2.1', title: 'Audio-only and Video-only (Prerecorded)', level: 'A', version: '2.2' },
    { criterion: '1.2.2', title: 'Captions (Prerecorded)', level: 'A', version: '2.2' },
    { criterion: '1.2.3', title: 'Audio Description or Media Alternative', level: 'A', version: '2.2' },
    { criterion: '1.2.4', title: 'Captions (Live)', level: 'AA', version: '2.2' },
    { criterion: '1.2.5', title: 'Audio Description', level: 'AA', version: '2.2' },
    { criterion: '1.3.1', title: 'Info and Relationships', level: 'A', version: '2.2' },
    { criterion: '1.3.2', title: 'Meaningful Sequence', level: 'A', version: '2.2' },
    { criterion: '1.3.3', title: 'Sensory Characteristics', level: 'A', version: '2.2' },
    { criterion: '1.3.4', title: 'Orientation', level: 'AA', version: '2.2' },
    { criterion: '1.3.5', title: 'Identify Input Purpose', level: 'AA', version: '2.2' },
    { criterion: '1.4.1', title: 'Use of Color', level: 'A', version: '2.2' },
    { criterion: '1.4.2', title: 'Audio Control', level: 'A', version: '2.2' },
    { criterion: '1.4.3', title: 'Contrast (Minimum)', level: 'AA', version: '2.2' },
    { criterion: '1.4.4', title: 'Resize Text', level: 'AA', version: '2.2' },
    { criterion: '1.4.5', title: 'Images of Text', level: 'AA', version: '2.2' },
    
    // Operable
    { criterion: '2.1.1', title: 'Keyboard', level: 'A', version: '2.2' },
    { criterion: '2.1.2', title: 'No Keyboard Trap', level: 'A', version: '2.2' },
    { criterion: '2.1.4', title: 'Character Key Shortcuts', level: 'A', version: '2.2' },
    { criterion: '2.2.1', title: 'Timing Adjustable', level: 'A', version: '2.2' },
    { criterion: '2.2.2', title: 'Pause, Stop, Hide', level: 'A', version: '2.2' },
    { criterion: '2.3.1', title: 'Three Flashes or Below', level: 'A', version: '2.2' },
    { criterion: '2.4.1', title: 'Bypass Blocks', level: 'A', version: '2.2' },
    { criterion: '2.4.2', title: 'Page Titled', level: 'A', version: '2.2' },
    { criterion: '2.4.3', title: 'Focus Order', level: 'A', version: '2.2' },
    { criterion: '2.4.4', title: 'Link Purpose (In Context)', level: 'A', version: '2.2' },
    { criterion: '2.4.5', title: 'Multiple Ways', level: 'AA', version: '2.2' },
    { criterion: '2.4.6', title: 'Headings and Labels', level: 'AA', version: '2.2' },
    { criterion: '2.4.7', title: 'Focus Visible', level: 'AA', version: '2.2' },
    { criterion: '2.4.10', title: 'Section Headings', level: 'AAA', version: '2.2' },
    
    // Understandable
    { criterion: '3.1.1', title: 'Language of Page', level: 'A', version: '2.2' },
    { criterion: '3.1.2', title: 'Language of Parts', level: 'AA', version: '2.2' },
    { criterion: '3.2.1', title: 'On Focus', level: 'A', version: '2.2' },
    { criterion: '3.2.2', title: 'On Input', level: 'A', version: '2.2' },
    { criterion: '3.2.3', title: 'Consistent Navigation', level: 'AA', version: '2.2' },
    { criterion: '3.2.4', title: 'Consistent Identification', level: 'AA', version: '2.2' },
    { criterion: '3.3.1', title: 'Error Identification', level: 'A', version: '2.2' },
    { criterion: '3.3.2', title: 'Labels or Instructions', level: 'A', version: '2.2' },
    { criterion: '3.3.3', title: 'Error Suggestion', level: 'AA', version: '2.2' },
    { criterion: '3.3.4', title: 'Error Prevention', level: 'AA', version: '2.2' },
    
    // Robust
    { criterion: '4.1.1', title: 'Parsing', level: 'A', version: '2.2' },
    { criterion: '4.1.2', title: 'Name, Role, Value', level: 'A', version: '2.2' },
    { criterion: '4.1.3', title: 'Status Messages', level: 'AA', version: '2.2' },

    // WCAG 2.2 Additions
    { criterion: '2.4.11', title: 'Focus Not Obscured (Minimum)', level: 'AA', version: '2.2' },
    { criterion: '2.4.12', title: 'Focus Not Obscured (Enhanced)', level: 'AAA', version: '2.2' },
    { criterion: '2.4.13', title: 'Focus Appearance', level: 'AAA', version: '2.2' },
    { criterion: '2.5.7', title: 'Dragging Movements', level: 'AA', version: '2.2' },
    { criterion: '2.5.8', title: 'Target Size (Minimum)', level: 'AA', version: '2.2' },
    { criterion: '3.2.6', title: 'Consistent Help', level: 'A', version: '2.2' },
    { criterion: '3.3.7', title: 'Redundant Entry', level: 'A', version: '2.2' },
    { criterion: '3.3.8', title: 'Accessible Authentication', level: 'AA', version: '2.2' },
    { criterion: '3.3.9', title: 'Accessible Authentication (Enhanced)', level: 'AAA', version: '2.2' },

    // Best Practices
    { criterion: 'BP-1', title: 'Descriptive Headings', level: 'Best practice', version: '2.2' },
    { criterion: 'BP-2', title: 'High Contrast Mode Support', level: 'Best practice', version: '2.2' },
    { criterion: 'BP-3', title: 'Focus Styles Enhancement', level: 'Best practice', version: '2.2' },
    { criterion: 'BP-4', title: 'Semantic HTML Usage', level: 'Best practice', version: '2.2' },
    { criterion: 'BP-5', title: 'ARIA Pattern Implementation', level: 'Best practice', version: '2.2' }
  ];

  // Insert all criteria
  await knex('wcag_criteria').insert(criteria);

  // Update existing issues to use the new wcag_criterion field
  const issues = await knex('issues').select('*');
  
  for (const issue of issues) {
    if (issue.wcag_criteria) {
      // Extract the criterion number (e.g., "1.1.1" from "WCAG 2.1 A 1.1.1 Non-text Content")
      const match = issue.wcag_criteria.match(/\d+\.\d+\.\d+/);
      if (match) {
        await knex('issues')
          .where('id', issue.id)
          .update({
            wcag_criterion: match[0]
          });
      }
    }
  }
}; 