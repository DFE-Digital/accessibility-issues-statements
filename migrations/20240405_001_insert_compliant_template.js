exports.up = async function(knex) {
  // Get the first super admin user to use as the creator/updater
  const adminUser = await knex('users')
    .where('role', 'super_admin')
    .first();

  if (!adminUser) {
    throw new Error('No super admin user found to set as creator of the template');
  }

  return knex('statement_templates').insert({
    name: 'Compliant template',
    version: '20250405_1',
    is_active: true,
    created_by: adminUser.id,
    updated_by: adminUser.id,
    content: `# Accessibility statement

This accessibility statement applies to {{ name_of_service }}.

This website is run by the Department for Education. We want as many people as possible to be able to use this website. For example, that means you should be able to:

- change colours, contrast levels and fonts
- zoom in up to 400% without the text spilling off the screen
- navigate most of the website using just a keyboard
- navigate most of the website using speech recognition software
- listen to most of the website using a screen reader (including the most recent versions of JAWS, NVDA and VoiceOver)

We've also made the website text as simple as possible to understand.

[AbilityNet](https://mcmw.abilitynet.org.uk/) has advice on making your device easier to use if you have a disability.

## Feedback and contact information

If you need information on this website in a different format like accessible PDF, large print, easy read, audio recording or braille:

- email [email address]
- call [phone number]
- [any other contact details]

We'll consider your request and get back to you in [number] days.

## Reporting accessibility problems with this website

We're always looking to improve the accessibility of this website. If you find any problems not listed on this page or think we're not meeting accessibility requirements, contact: [provide both details of how to report these issues and contact details for the unit or person responsible for dealing with these reports].

## Enforcement procedure

The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 (the 'accessibility regulations'). If you're not happy with how we respond to your complaint, [contact the Equality Advisory and Support Service (EASS)](https://www.equalityadvisoryservice.com/).

## Technical information about this website's accessibility

The Department for Education is committed to making its websites accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.

## Compliance status

This website is fully compliant with the WCAG version 2.2 AA standard.

## Preparation of this accessibility statement

This statement was prepared on [date when it was first published]. It was last reviewed on [date when it was last reviewed].

This website was last tested on [date]. The test was carried out by [add name of organisation that carried out test, or indicate that you did your own testing].

We used this approach to deciding on a sample of pages to test [add link to explanation of how you decided which pages to test].

Accessibility statement version: 2.0.0`
  });
};

exports.down = function(knex) {
  return knex('statement_templates')
    .where({
      name: 'Compliant template',
      version: '20250405_1'
    })
    .del();
}; 