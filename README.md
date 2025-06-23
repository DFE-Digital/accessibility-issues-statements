# Accessibility Issues and Statements Service

This is the Department for Education's service for managing accessibility issues and generating real-time accessibility statements.

## Technical setup guide

This guide explains how to get the application running locally for development.


> We recommend you read these instructions through before attempting to deploy this product.


### Prerequisites

*   **Node.js:** Please use the latest Long-Term Support (LTS) version
*   **SQL Server:** A running instance of Microsoft SQL Server
*   **Git:** For version control
*   **GOV.UK Notify** For sending emails
*   **Azure App Service** Running the serivce (Basic app service plan is sufficient)
*   **Azure SQL (mssql)** Basic database is sufficient

### 1. Clone the repository

First, clone the repository to your local machine:

```bash
git clone https://github.com/your-repo/accessibility-issues-statements.git
cd accessibility-issues-statements
```

### 2. Install dependencies

Install the required Node.js packages using npm:

```bash
npm install
```

### 3. Set up your environment variables

Create a `.env` file in the root of the project by copying the example below. This file is for your local environment variables and is ignored by Git.

```
# Node environment
NODE_ENV=development

# Session secret - change this to a long random string
SESSION_SECRET=a-very-secret-string-that-you-should-change

# Application Port
PORT=3000

# Base URL
BASE_URL=http://localhost:3000

# Database connection details
DB_SERVER=localhost
DB_USER=
DB_PASSWORD=
DB_DATABASE=accessibility_statements
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# GOV.UK Notify
# You will need a GOV.UK Notify account and an API key.
# Create the email templates and add their IDs here.
NOTIFY_API_KEY=
GOVUK_NOTIFY_MAGIC_LINK_TEMPLATE_ID=
GOVUK_NOTIFY_WELCOME_TEMPLATE_ID=
GOVUK_NOTIFY_ISSUE_ASSIGNED_ID=
GOVUK_NOTIFY_RETESTREQUEST_TEMPLATE_ID=
GOVUK_NOTIFY_RETESTCOMPLETE_TEMPLATE_ID=

# Who will get emails for retest requests? usually accessibility specialist or inbox
DESIGN_OPS_EMAIL=


# Airtable for feedback (optional)
# Contact DesignOps for these keys if needed
AIRTABLE_FEEDBACK_KEY=
AIRTABLE_FEEDBACK_BASE=

# Application URL
APP_URL=http://localhost:3411

# Reporting

RED_THRESHOLD=10
```

**Important:** Update the `DB_USER` and `DB_PASSWORD` with the credentials for your local SQL Server instance. The `DB_DATABASE` can usually be left as is.

### 4. Set up the database

You need to create the database and run the migrations to set up the required tables.

First, ensure your SQL Server instance is running and that you have created a database named `accessibility_statements`.

Then, run the database migrations using Knex:

```bash
npm run migrate
```

This will create all the necessary tables in your database.

### 5. Seed the database

To get the application running with the necessary data, you need to run two seed files.

First, run the WCAG criteria seed to populate the database with the accessibility standards, (you can later manage these in the admin interface (as super user))

```bash
npx knex seed:run --specific=wcag_criteria_seed.js
```

Next, you need to add data for your department. Before you run the seed, you must **edit the seed file** to include your department's details.

Open `seeds/department_seed.js` and fill in the placeholder values at the top of the file.

Once you have updated the file, run the seed:

```bash
npx knex seed:run --specific=department_seed.js
```

### 6. Verify the data

After running the seeds, verify that the data has been populated correctly:

1.  **Check WCAG criteria:** Go to **WCAG Criteria** in the navigation to ensure all accessibility standards have been loaded.
2.  **Check departments:** Verify your department information is present.

### 7. Run the application

Now you can start the application in development mode:

```bash
npm run dev
```

The application will be running at [http://localhost:3411](http://localhost:3411).

The server uses `nodemon`, so it will automatically restart whenever you save a file.

### 8. Set up as a department

After running the seeds, you need to verify your department setup and create the required statement templates.

#### Verify department information

1.  Sign in to the application as a super admin using the credentials you set up in the `department_seed.js` file.
2.  Go to **Departments** in the navigation.
3.  Check that your department information, admins, and allowed domains are correct.

This super-admin allows someone to manage multiple areas of a department that may need their own branding and scope of issues. For example, where a main department manages a service for
Arms Length Bodies or Agencies under their juristiction. 

The admins can be within the ALB/Agencies and manage their own branding then if necessary.

This is why this seems a bit odd to have a super admin and department admins. 

#### Verify branding setup

1.  Sign in as a department admin using the credentials you set up in the `department_seed.js` file.
2.  Go to **Departments** in the navigation and check your branding is set up correctly.
3.  You may need to add your brand files from the [UK Government brand resource centre](https://hmgbrand.gcs.civilservice.gov.uk/).
4.  Download the PNG files and add them to the `app/public/images/brands` folder.
5.  Name the files according to your department name:
    *   `{department-name}_black.png` (e.g., `ministry-of-animals_black.png`)
    *   `{department-name}_white.png` (e.g., `ministry-of-animals_white.png`)

**Note:** Use lowercase letters and hyphens in the filename, matching your department name as set in the service.

#### Create statement templates

The application requires three statement templates to function properly. These templates are used to generate accessibility statements based on the number of issues found.

1.  Go to **Statement Templates** in the navigation.
2.  Create three templates with these exact names (they must match exactly):
    *   `Compliant`
    *   `Partially compliant`
    *   `Non-compliant`
3.  Use the content from the corresponding files in the `/statement_templates` folder:
    *   `compliant.md`
    *   `partially.md`
    *   `noncompliant.md`

**Important:** The template names must match exactly as they are used in the application logic to determine which statement to display based on the number of accessibility issues.

## GOV.UK Notify Integration

This service uses GOV.UK Notify to send emails for different events. To set this up for local development, you will need:
1.  A GOV.UK Notify account.
2.  An API key with permission to send emails.
3.  Three email templates created in your Notify account.

Add your API key and the template IDs to your `.env` file.

You can find the content for these templates in the `/notify_templates` directory:
*   `GOVUK_NOTIFY_MAGIC_LINK_TEMPLATE_ID.md`
*   `GOVUK_NOTIFY_WELCOME_TEMPLATE_ID.md`
*   `GOVUK_NOTIFY_ISSUE_ASSIGNED_ID.md`
*   `GOVUK_NOTIFY_RETESTREQUEST_TEMPLATE_ID`

You will need to create these templates in your own Notify account and use their unique IDs in your environment configuration.

## Contributing

Please see our [Contributing Guide](CONTRIBUTING.md) for details on how you can contribute to this project.
