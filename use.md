# Using the Accessibility Issues Service

This guide provides an overview of the features and processes within the Accessibility Issues Service. It is designed to help users understand the different functionalities available based on their assigned role.

## User Roles

The service has three main user roles:

*   **User:** Can view services they are assigned to and the issues within them. They can comment on and manage issues assigned to them.
*   **Department Admin:** Has full control over their department's services, issues, users, and settings.
*   **Super Admin:** Has site-wide administrative privileges, including managing departments, statement templates, and WCAG criteria.

---

## Service Management (Department Admins)

### Adding a New Service

Department Admins can register new digital services that require accessibility monitoring.

1.  From the dashboard, navigate to the **Services** section.
2.  Click the **"Add a new service"** button.
3.  Fill in the required details, such as the service name, URL, and the business area it belongs to.
4.  Once saved, the service will appear in your department's list of services.

### Setting Up Statement Settings & Enrolling

For a service to have a public accessibility statement, its settings must be configured and it must be enrolled.

1.  Go to the service's page and click on the **"Service settings"** tab.
2.  Complete all the required sections, including:
    *   **Response Time:** Define the expected response time for user-reported issues.
    *   **Complaint Contact:** Specify the contact details for handling complaints.
    *   **Audit & Review:** Provide details about the last accessibility audit.
    *   **Contact Methods:** Add ways for users to get in touch about accessibility issues.
3.  Once all settings are complete, a button to **"Enroll for a public accessibility statement"** will become available. Clicking this will generate a public statement page for the service.
4.  Once the statement has been added to the service it is for (updating the footer link) click the **Validate installation** button on the Statement tab.

---

## Issue Management (All Users)

### Adding an Issue

Department Admins and assigned Users can add new accessibility issues to a service.

1.  Navigate to the specific service page and go to the **"Issues"** tab.
2.  Click **"Add a new issue"**.
3.  Provide a descriptive title, a detailed description of the issue, its priority, the source of discovery, and any associated WCAG criteria.
4.  You can also specify a resolution plan, including a planned fix date or a reason if the issue will not be fixed.

### Managing an Issue

On the issue details page, users can perform several actions:

*   **Add Comments:** Use the comment box to add updates, questions, or other relevant information.
*   **Assign Issue:** Assign the issue to a specific user within the department. This user will be notified.
*   **Add External Resources:** Link to external documents, designs, or tickets using the "Add new resource" action.

### Requesting a Retest

When a fix has been implemented, a user can request a retest from the DesignOps team.

1.  On the issue page, click **"Request a retest"** from the actions menu.
2.  This flags the issue and sends a notification to DesignOps, who will then schedule and perform a retest.

### Completing a Retest (Department Admins)

After DesignOps has completed their retest and communicated the results, a Department Admin can mark the process as complete.

1.  On the issue page, a notification banner for the retest request will be visible.
2.  Click **"Mark retest as complete"**.
3.  A modal will appear, prompting you to add a comment about the outcome (e.g., "Retest passed, issue can be closed").
4.  This adds the comment to the issue and notifies the user assigned to the issue.

### Closing and Reopening an Issue

*   **To Close:** If an issue is resolved, click **"Close issue"**. You will be prompted to add a final comment explaining the resolution.
*   **To Reopen:** If a closed issue resurfaces, click **"Reopen issue"**. You will need to provide a comment explaining why it is being reopened.

---

## Super Admin Features

Super Admins have access to global settings that affect the entire platform.

### Managing Department Admins

1.  Navigate to the **"Departments"** area from the main navigation.
2.  Select a department to view its details.
3.  Here you can add or remove users as Department Admins for that department.
4.  Read the readme.md file for setting these up for the first time

### Managing Statement Templates

Super Admins control the templates used for generating public accessibility statements.

1.  Navigate to **"Statement Templates"** from the main navigation.
2.  You can create, edit, or delete templates that will be available for all services when generating accessibility statements.
3.  Read the readme.md file for setting these up for the first time.

### Managing WCAG Criteria

The list of WCAG criteria used when reporting issues is managed by Super Admins.

1.  Navigate to **"WCAG Criteria"** from the main navigation.
2.  Here you can add new criteria, or edit and delete existing ones to ensure the list is up-to-date.
