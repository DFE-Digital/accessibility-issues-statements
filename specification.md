# Specification Document: Multi-Tenant Government Accessibility Issue Management Service

---

## 1. Project Overview
### Purpose & Problem Statement
Government departments face challenges managing accessibility risks due to inconsistent and outdated accessibility statements. Without a centralized system:
- **Why:** Departments cannot identify common issues or track remediation efforts, which inhibits effective training and support.
- **How:** By tracking real-time issues and generating dynamic accessibility statements, the system ensures that statements meet legal requirements (Public Sector Websites and Applications Accessibility Regulations 2018, DfE standards) and provide actionable insights for improvement.

### High-Level Vision
- **Department Admins:** 
  - **Why:** Need to monitor overall departmental performance and compliance.
  - **How:** They view detailed reports showing issue counts, risk levels, overdue items, and resolution times.
- **Service Owners:** 
  - **Why:** Responsible for individual service performance and training needs.
  - **How:** They can modify service details, monitor key metrics (e.g., statement views, risk metrics), and act on alerts to manage remediation efforts.
- **Users:** 
  - **Why:** Must be able to easily report accessibility issues.
  - **How:** They access a simple interface for adding issues, viewing issue history, and linking updates—ensuring issues are tracked effectively.
- **Super Admins:** 
  - **Why:** Ensure overall consistency and security across all departments.
  - **How:** They manage departments and users, configure WCAG standards, and oversee comprehensive audit logs.

---

## 2. Goals & Objectives
### Strategic Goals
- **Compliance Improvement:**  
  - **Why:** To meet legal and regulatory standards.
  - **How:** Enforce dynamic accessibility statement generation and audit data, aligned with [DfE Accessibility Conformance](https://standards.education.gov.uk/standard/accessibility-conformance) and [Accessibility Statements](https://standards.education.gov.uk/standard/accessibility-statements).
- **Enhanced Transparency & Reporting:**  
  - **Why:** To highlight recurring issues and guide training.
  - **How:** Detailed metrics on issues (type, frequency, time to resolution) provide insights into departmental performance.
- **Accurate & Up-to-Date Accessibility Statements:**  
  - **Why:** To ensure legal compliance and user trust.
  - **How:** Dynamic generation from real-time issue data prevents outdated or incomplete statements.
- **Risk Reduction:**  
  - **Why:** To support users facing accessibility barriers.
  - **How:** A centralized system identifies and mitigates risks by tracking the resolution process.

### Measurable Outcomes
- Audit scores and compliance rates.
- Adoption rates of accessibility statements (tracked by unique URL views).
- Number of issues reported, and average time to resolution.
- Feedback from accessibility audits and end-users.

---

## 3. User Roles & Permissions
### Role Responsibilities
- **Super Admin:**  
  - **What:** Create/manage departments, department admins, and all users; suspend accounts; configure WCAG standards.
  - **Why:** Provides overarching control to ensure uniformity and security across departments.
  - **How:** Using an administrative dashboard with granular controls and audit logs.

- **Department Admin:**  
  - **What:** Add/manage services and users; monitor departmental reports; access department-specific audit logs.
  - **Why:** To ensure that each department’s data remains isolated and actionable.
  - **How:** Via dashboards that filter data by `departmentId` and allow service/user management.

- **Service Owners:**  
  - **What:** Modify service details, view metrics (risk levels, statement views, overdue issues), and receive alerts.
  - **Why:** To enable proactive management of accessibility issues and training opportunities.
  - **How:** Through a service-specific management interface and integrated reporting features.

- **Users:**  
  - **What:** Report and update issues, add comments, and track resolution progress.
  - **Why:** To provide a clear, traceable process for addressing accessibility barriers.
  - **How:** Using an issue submission form and interactive dashboard.

### Data Isolation & Security
- **How:** All data is stored in shared tables with a `departmentId` field ensuring that queries always filter by department.
- **Why:** To maintain data integrity and prevent unauthorized cross-departmental access.

---

## 4. Project Scope & Constraints
### Functional Scope (MVP)
- **Authentication:**  
  - Magic link sign-in via GOV.UK Notify.
- **Issue Management:**  
  - Create, update, comment, and close issues.
- **Reporting:**  
  - Real-time dashboards and CSV/Excel exports.
- **Dynamic Accessibility Statements:**  
  - Unique service URLs that generate live statements based on issue data.
- **User & Role Management:**  
  - Comprehensive administration across roles.

### Non-Functional Requirements
- **Security & Compliance:**  
  - HTTPS/TLS for data in transit.
  - Azure SQL encryption at rest.
  - Full audit trails and RBAC.
  - Adherence to GDPR, ISO27001, OWASP guidelines, GOV.UK Tech Code of Practice, and GOV Service Standards.
- **API-First Design:**  
  - Ensures scalability and future integrations.
- **Performance:**  
  - Monitored using Application Insights.
- **Maintenance:**  
  - Scheduled outside core business hours with incident management via the DfE DesignOps team.

---

## 5. Metrics & North Star
### Key Metrics
- **North Star Metric:**  
  - **Adoption of Accessibility Statements:**  
    - **Why:** Indicates overall system usage and compliance.
    - **How:** Track statement views via unique service URLs and callback mechanisms.
- **Supporting Metrics:**  
  - Issue counts and breakdown by risk level.
  - Average time to resolve issues.
  - Sources of issue discovery (added as a required field during issue reporting).
  - Engagement metrics (comments, updates, and actions taken).

---

## 6. User Processes & Workflows
### End-to-End Workflow
1. **Authentication:**
   - **Process:**  
     - Unauthenticated users enter their email to receive a magic link.
     - **Why:** Provides secure, passwordless login.
     - **How:** GOV.UK Notify sends the token; token verification occurs on click.
2. **Dashboard Access:**
   - **Process:**  
     - Upon authentication, users see a dashboard with their associated services.
     - **Why:** To centralize service management and issue reporting.
     - **How:** Dashboard dynamically queries Azure SQL filtering by `departmentId`.
3. **Issue Reporting & Management:**
   - **Process:**  
     - Users search for a service, review existing issues, and submit new ones if necessary.
     - **Why:** Prevents duplication and ensures timely updates.
     - **How:** The issue form collects title, description, impacted WCAG criteria, fix plan, ownership, and source of issue discovery.
4. **Notifications:**
   - **Process:**  
     - Service Owners are notified when new issues are added or closed.
     - **Why:** To prompt timely action.
     - **How:** Email notifications via GOV.UK Notify using predefined templates.
5. **Reporting:**
   - **Process:**  
     - Real-time reports and dashboards display metrics such as overdue issues and risk levels.
     - **Why:** To facilitate oversight and proactive management.
     - **How:** Reports are generated on page load with export options.

---

## 7. Ecosystem Map & Integration
### Data Flow & Security
- **Communication:**
  - **How:** All components (Node.js backend, GOV.UK Frontend, Azure SQL, and GOV.UK Notifications) communicate over HTTPS with TLS.
  - **Why:** Ensures data privacy and integrity.
- **Data Storage:**
  - **How:** A single set of tables in Azure SQL stores data, with each record tagged by `departmentId`.
  - **Why:** Simplifies multi-tenant management while enforcing data isolation.
- **API-First:**
  - **How:** Every feature is exposed as a secure API endpoint.
  - **Why:** Supports integration, scalability, and future enhancements (e.g., integration with external service registers).

---

## 8. Stakeholder Map
### Primary Stakeholders & Their Needs
- **Accessibility Champions / Department Heads:**  
  - **Why:** Need actionable insights for training and process improvement.
  - **How:** Detailed reports on issue types, frequency, and resolution times.
- **Chief Digital Officers:**  
  - **Why:** Require high-level metrics to monitor departmental risk and compliance.
  - **How:** Executive dashboards displaying aggregated risk and performance data.
- **GDS Head of Accessibility:**  
  - **Why:** Interested in cross-departmental trends to drive government-wide improvements.
  - **How:** Aggregated analytics and insights on common issues across departments.

---

## 9. Technical Architecture & Blueprints
### Multi-Tenancy & MVC Design
- **Database Design:**
  - **How:** Use single database tables with a `departmentId` field for all records.
  - **Why:** Simplifies the architecture while ensuring strict data isolation.
- **MVC Structure:**
  - **Model:**  
    - Data models represent users, services, issues, comments, and audit logs.
    - **How:** Define schemas and relationships with validation rules.
  - **View:**  
    - GOV.UK Frontend delivers user interfaces for dashboards, forms, and reports.
    - **Why:** Consistent design across government services.
  - **Controller:**  
    - Business logic and API endpoints implemented in Node.js.
    - **How:** Controllers process requests, invoke model functions, and return responses.
- **Security:**
  - **How:** Implement token-based authentication (JWT) and enforce RBAC on every API call.
  - **Why:** Prevent unauthorized access and cross-department data leaks.
- **Data Access:**
  - **How:** Use parameterized queries or ORM frameworks to interact with Azure SQL.
  - **Why:** Mitigate SQL injection and ensure consistent data handling.

---

## 10. Support Processes & Maintenance
### Operational Support
- **Monitoring & Maintenance:**
  - **How:** Leverage Application Insights on Azure for performance monitoring.
  - **Why:** Early detection of performance issues and anomalies.
- **Incident Management:**
  - **How:** DfE DesignOps team manages incidents using best practices, including clear escalation paths and post-incident reviews.
  - **Why:** Ensure prompt resolution and continuous improvement.
- **Communication Channels:**
  - **How:** Set up a dedicated Slack channel for cross-government support and announcements.
  - **Why:** Facilitate real-time collaboration and updates.
- **Public Information:**
  - **How:** Publish support, announcement, and feature update pages accessible within the service.
  - **Why:** Provide transparency and timely information to end-users.

---

## 11. Future Considerations & Enhancements
### Scalability & Integration
- **Advanced Reporting:**  
  - **How:** Future integration with PowerBI for advanced analytics over Azure SQL.
  - **Why:** Deeper insights into departmental and cross-department trends.
- **Service Discovery & Data Import:**
  - **How:** Allow services to be imported via CSV or discovered via secure APIs from a central service register.
  - **Why:** Enable dynamic service enrollment and ensure service IDs are non-guessable (e.g., using UUIDs).
- **Configurable WCAG Standards:**
  - **How:** Super Admins can configure WCAG versions, levels, and criteria that apply universally.
  - **Why:** Adapt to evolving standards and provide consistent conformance across all departments.
- **Future Integrations:**
  - **How:** API endpoints can later be extended to integrate with external systems like GitHub for issue tracking.
  - **Why:** Improve workflow automation without impacting the MVP.

---

## 12. GitHub Issues – Initial Project Tasks
To kick off development, consider creating the following GitHub issues:

1. **Project Setup & Repository Initialization**
   - **Task:** Set up a new Node.js repository with an MVC framework.
   - **Details:** Initialize GitHub repository, configure linting, testing, and deployment pipelines.

2. **Authentication Module**
   - **Task:** Implement magic link sign-in using GOV.UK Notify.
   - **Details:** Create endpoints for generating and verifying tokens, integrate email sending with GOV.UK Notify.

3. **User & Role Management**
   - **Task:** Develop CRUD operations for users, roles, and departments.
   - **Details:** Ensure RBAC is enforced; create data models and access functions.

4. **Service & Issue Management**
   - **Task:** Build models and controllers for services and issues.
   - **Details:** Implement issue submission, updates, comment history, and resolution tracking.

5. **Reporting Dashboard**
   - **Task:** Create dynamic reporting pages for different roles.
   - **Details:** Develop real-time report generation and export functionality (CSV/Excel).

6. **Audit Logging**
   - **Task:** Implement audit logging for all critical actions.
   - **Details:** Ensure logs capture user, department, timestamp, and action details.

7. **GOV.UK Frontend Integration**
   - **Task:** Develop the user interface using GOV.UK Frontend components.
   - **Details:** Create views for dashboards, service pages, and dynamic accessibility statement pages.

8. **Security Enhancements**
   - **Task:** Enforce HTTPS, data encryption, and secure coding practices.
   - **Details:** Audit the application for OWASP compliance, configure TLS for all endpoints.

9. **Integration Testing & CI/CD Pipeline**
   - **Task:** Write integration tests and set up a CI/CD pipeline.
   - **Details:** Ensure all modules are covered by tests; automate deployment to Azure.

---

## 13. GOV.UK Notify Templates
### Required Templates & Their Content
1. **Magic Link Sign-In Email**
   - **Content:**
     - Subject: "Your Secure Sign-In Link"
     - Body: A clear explanation that the link is valid for one-time use, a call to action (click to sign in), and instructions for contacting support if the user did not request the email.
     - Security note: Remind users not to share the link.
  
2. **New Issue Notification Email**
   - **Content:**
     - Subject: "New Accessibility Issue Reported for [Service Name]"
     - Body: Details of the issue (title, brief description, impacted WCAG criteria) and a call-to-action for the Service Owner to review the issue.
     - Include a link to the issue details in the admin portal.

3. **Issue Closure Notification Email**
   - **Content:**
     - Subject: "Accessibility Issue Resolved for [Service Name]"
     - Body: Details on the resolution (who closed it, resolution method, relevant links to deployment/PR) and confirmation that the issue has been closed.
     - Optionally, a feedback request regarding the resolution process.

---

## 14. Final Clarifications & Next Steps
- **Authentication & Authorization:**  
  - Use GOV.UK Notify for magic link sign-in and implement strict RBAC at all layers.
- **MVC & Data Access:**  
  - The Node.js application will follow the MVC pattern with clear separation of models, views, and controllers. Data access functions will use secure, parameterized queries or ORM methods to interact with Azure SQL.
- **Timeline & Milestones:**  
  - Define clear milestones for each major module (authentication, user management, service/issue management, reporting) followed by iterative testing and deployment.
- **Documentation & Training:**  
  - Create comprehensive documentation for each module and role. Set up training sessions and maintain an accessible repository of support and release notes.
