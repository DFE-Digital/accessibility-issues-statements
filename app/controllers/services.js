const { db } = require("../db");
const servicesData = require("../data/services");
const businessAreasData = require("../data/business_areas");
const serviceRepositoriesData = require("../data/service_repositories");
const { getDepartmentServices } = require("../data/services");
const { getServiceIssues } = require("../data/issues");
const usersData = require("../data/users");

/**
 * Get services for the current user's department
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const index = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;
    const departmentId = user.department.id; // Access department ID from the nested department object

    // Get filter parameters from query string
    const filters = {
      search: req.query.search,
      business_areas: req.query.business_areas
        ? Array.isArray(req.query.business_areas)
          ? req.query.business_areas
          : [req.query.business_areas]
        : [],
      has_issues: req.query.has_issues,
      no_issues: req.query.no_issues,
      enrolled: req.query.enrolled,
      not_enrolled: req.query.not_enrolled,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    // Get services and stats based on user role
    let services, stats, totalCount;

    if (user.role === "super_admin") {
      // Super admin can see all services
      [services, stats, totalCount] = await Promise.all([
        servicesData.getAllServices(filters),
        servicesData.getServicesStats(),
        servicesData.getServicesCount(filters),
      ]);
    } else if (user.role === "department_admin") {
      // Department admin can see services in their department
      [services, stats, totalCount] = await Promise.all([
        servicesData.getDepartmentServices(departmentId, filters),
        servicesData.getDepartmentServicesStats(departmentId),
        servicesData.getDepartmentServicesCount(departmentId, filters),
      ]);
    } else {
      // Regular users can see services they have access to
      [services, stats, totalCount] = await Promise.all([
        servicesData.getUserServices(user.id, filters),
        servicesData.getUserServicesStats(user.id),
        servicesData.getUserServicesCount(user.id, filters),
      ]);
    }

    // Calculate pagination values
    const totalPages = Math.ceil(totalCount / filters.limit);
    const currentPage = Math.min(Math.max(filters.page, 1), totalPages || 1);

    // Show up to 5 pages around the current page
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust start page if we're near the end
    if (endPage - startPage < 4 && startPage > 1) {
      startPage = Math.max(1, endPage - 4);
    }

    // Render the unified services view
    res.render("services/index", {
      services,
      stats,
      user,
      filters,
      business_areas: await businessAreasData.getDepartmentBusinessAreas(
        departmentId
      ),
      pagination: {
        currentPage,
        totalPages: totalPages || 1,
        startPage,
        endPage,
        limit: filters.limit,
      },
    });
  } catch (error) {
    console.error("Services error:", error);
    res.status(500).render("error", {
      error: "There was a problem loading the services",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Show new service form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const newService = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;
    const businessAreas = await businessAreasData.getDepartmentBusinessAreas(
      user.department.id
    );
    const departmentUsers = await usersData.getDepartmentUsers(
      user.department.id
    );

    res.render(`services/${user.role}/new`, {
      user,
      businessAreas,
      departmentUsers,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("New service form error:", error);
    res.status(500).render("error", {
      error: "There was a problem loading the new service form",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create a new service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createService = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;
    const { name, url, business_area_id, service_owner_id } = req.body;

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = { name, url, business_area_id, service_owner_id };

    if (!name || name.trim() === "") {
      const message = "Enter a service name";
      errorSummary.push({ field: "name", message });
      fieldErrors.name = message;
    } else if (name.length > 255) {
      const message = "Service name must be 255 characters or less";
      errorSummary.push({ field: "name", message });
      fieldErrors.name = message;
    }

    if (!url || url.trim() === "") {
      const message = "Enter a service URL";
      errorSummary.push({ field: "url", message });
      fieldErrors.url = message;
    } else if (!url.match(/^https?:\/\/.+/)) {
      const message = "Enter a valid URL starting with http:// or https://";
      errorSummary.push({ field: "url", message });
      fieldErrors.url = message;
    }

    if (!service_owner_id) {
      const message = "Select a service owner";
      errorSummary.push({ field: "service_owner_id", message });
      fieldErrors.service_owner_id = message;
    }

    // If there are validation errors, render the form again with errors
    if (errorSummary.length > 0) {
      const businessAreas = await businessAreasData.getDepartmentBusinessAreas(
        user.department.id
      );
      const departmentUsers = await usersData.getDepartmentUsers(
        user.department.id
      );
      return res.render(`services/${user.role}/new`, {
        user,
        businessAreas,
        departmentUsers,
        errors: errorSummary,
        fieldErrors,
        values,
        csrfToken: req.csrfToken(),
      });
    }

    // Start a transaction
    await db.transaction(async (trx) => {
      // Create the service
      const serviceData = {
        name: name.trim(),
        url: url.trim(),
        department_id: user.department.id,
        business_area_id: business_area_id || null,
        service_owner_id: service_owner_id,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const service = await servicesData.createService(serviceData);

      // Log the creation
      await servicesData.logServiceAction(
        service.id,
        user.id,
        "create",
        serviceData
      );
    });

    res.redirect("/services");
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).render("error", {
      error: "There was a problem creating the service",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Show service overview and user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showService = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    // Fetch the service by ID directly and check department ownership
    const service = await servicesData.getService(id);
    if (!service || service.department_id !== user.department.id) {
      return res.status(404).render("error", {
        error: {
          title: "Service not found",
          message: "The service you are looking for could not be found.",
        },
      });
    }

    // Get issues for analysis
    const issues = await getServiceIssues(id);

    // Calculate dates
    const currentDate = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    // Calculate issue statistics
    const openIssues = issues.filter((issue) =>
      ["open", "in_progress"].includes(issue.status)
    );
    const pastDueIssues = openIssues.filter((issue) => {
      if (!issue.planned_fix) return false;
      return new Date(issue.planned_fix) < currentDate;
    });
    const upcomingIssues = openIssues.filter((issue) => {
      if (!issue.planned_fix) return false;
      const plannedDate = new Date(issue.planned_fix);
      return plannedDate >= currentDate && plannedDate <= threeMonthsFromNow;
    });

    // Get service users - temporarily using a placeholder until user_services table is set up
    const serviceUsers = [];

    res.render("services/department_admin/show", {
      service,
      serviceUsers,
      stats: {
        openIssues: openIssues.length,
        pastDueIssues: pastDueIssues.length,
        upcomingIssues: upcomingIssues.length,
        totalIssues: issues.length,
      },
      pastDueIssues,
      upcomingIssues,
      issues: openIssues,
      current_date: currentDate,
      three_months_from_now: threeMonthsFromNow,
    });
  } catch (error) {
    console.error("Error showing service:", error);
    res.status(500).render("error", {
      error: {
        title: "Error",
        message: "There was a problem loading the service details.",
      },
    });
  }
};

/**
 * Show service issues list and management
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showServiceIssues = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const user = req.session.user;
    const { sort, order } = req.query;

    // Get filter parameters from query string
    const filters = {
      wcag_level: req.query.wcag_level || "",
      planned_fix: req.query.planned_fix || "",
      planned_fix_date: req.query.planned_fix_date || "",
      search: req.query.search || "",
    };

    // Fetch the service by ID directly
    const service = await servicesData.getService(serviceId);
    if (!service || service.department_id !== user.department.id) {
      return res.status(404).render("error", {
        error: {
          title: "Service not found",
          message: "The service you are looking for could not be found.",
        },
      });
    }

    // Get issues for the service
    const issues = await getServiceIssues(serviceId);

    // Calculate counts and filter issues
    let openIssues = issues.filter((issue) => issue.status === "open");
    let closedIssues = issues.filter((issue) => issue.status === "closed");

    // Apply filters to open issues
    if (filters.wcag_level) {
      openIssues = openIssues.filter(
        (issue) => issue.wcag_level === filters.wcag_level
      );
    }

    if (filters.planned_fix !== "") {
      const hasPlannedFix = filters.planned_fix === "true";
      openIssues = openIssues.filter(
        (issue) => issue.planned_fix === hasPlannedFix
      );
    }

    if (filters.planned_fix_date) {
      const now = new Date();
      openIssues = openIssues.filter((issue) => {
        if (!issue.planned_fix_date) return false;
        const fixDate = new Date(issue.planned_fix_date);

        switch (filters.planned_fix_date) {
          case "overdue":
            return fixDate < now;
          case "next_month":
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return fixDate >= now && fixDate <= nextMonth;
          case "next_3_months":
            const next3Months = new Date(now);
            next3Months.setMonth(next3Months.getMonth() + 3);
            return fixDate >= now && fixDate <= next3Months;
          case "next_6_months":
            const next6Months = new Date(now);
            next6Months.setMonth(next6Months.getMonth() + 6);
            return fixDate >= now && fixDate <= next6Months;
          default:
            return true;
        }
      });
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      openIssues = openIssues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchTerm) ||
          (issue.wcag_level &&
            issue.wcag_level.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters to closed issues
    if (filters.wcag_level) {
      closedIssues = closedIssues.filter(
        (issue) => issue.wcag_level === filters.wcag_level
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      closedIssues = closedIssues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchTerm) ||
          (issue.wcag_level &&
            issue.wcag_level.toLowerCase().includes(searchTerm))
      );
    }

    // Sort issues based on query parameters
    if (sort && order) {
      const sortOrder = order === "desc" ? -1 : 1;
      const sortKey = sort === "created_at" ? "created_at" : sort;

      openIssues.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1 * sortOrder;
        if (a[sortKey] > b[sortKey]) return 1 * sortOrder;
        return 0;
      });

      closedIssues.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return -1 * sortOrder;
        if (a[sortKey] > b[sortKey]) return 1 * sortOrder;
        return 0;
      });
    }

    res.render("services/department_admin/issues/issues", {
      service,
      open_issues: openIssues,
      closed_issues: closedIssues,
      filters,
      sort,
      order,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error in showServiceIssues:", error);
    res.status(500).render("error", {
      error: "Failed to load service issues",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Show edit service form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const editService = async (req, res) => {
  try {
    // Double check authentication (belt and braces)
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;
    const serviceId = req.params.id;

    // Get the service
    const service = await servicesData.getService(serviceId);

    if (!service) {
      return res.status(404).render("error", {
        error: "Service not found",
      });
    }

    // Check if user has permission to edit this service
    if (
      user.role !== "super_admin" &&
      service.department_id !== user.department.id
    ) {
      return res.status(403).render("error", {
        error: "You do not have permission to edit this service",
      });
    }

    // Get department users for the service owner dropdown
    const departmentUsers = await usersData.getDepartmentUsers(
      service.department_id
    );

    // Get business areas for the department
    const businessAreas = await businessAreasData.getDepartmentBusinessAreas(
      service.department_id
    );

    res.render("services/edit", {
      user,
      service,
      departmentUsers,
      businessAreas,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("Edit service error:", error);
    res.status(500).render("error", {
      error: "There was a problem loading the edit service form",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateService = async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;
    const { id } = req.params;
    const {
      name,
      url,
      business_area_id,
      service_owner_id,
      rosid,
      cmdbid,
      repositories = [],
    } = req.body;

    // Get the existing service to perform validation against it
    const existingService = await servicesData.getService(id);
    if (!existingService) {
      return res.status(404).render("error", { error: "Service not found" });
    }

    // Check if user has permission to edit this service
    if (
      user.role !== "super_admin" &&
      existingService.department_id !== user.department.id
    ) {
      return res
        .status(403)
        .render("error", {
          error: "You do not have permission to edit this service",
        });
    }

    // Validate input
    const errorSummary = [];
    const fieldErrors = {};
    const values = {
      name,
      url,
      business_area_id,
      service_owner_id,
      rosid,
      cmdbid,
      repositories,
    };

    if (!name || name.trim() === "") {
      const message = "Enter a service name";
      errorSummary.push({ field: "name", message });
      fieldErrors.name = message;
    } else if (name.length > 255) {
      const message = "Service name must be 255 characters or less";
      errorSummary.push({ field: "name", message });
      fieldErrors.name = message;
    }

    if (!url || url.trim() === "") {
      const message = "Enter a service URL";
      errorSummary.push({ field: "url", message });
      fieldErrors.url = message;
    } else if (!url.match(/^https?:\/\/.+/)) {
      const message = "Enter a valid URL starting with http:// or https://";
      errorSummary.push({ field: "url", message });
      fieldErrors.url = message;
    }

    if (!service_owner_id) {
      const message = "Select a service owner";
      errorSummary.push({ field: "service_owner_id", message });
      fieldErrors.service_owner_id = message;
    }

    // If there are validation errors, render the form again with errors
    if (errorSummary.length > 0) {
      const businessAreas = await businessAreasData.getDepartmentBusinessAreas(
        user.department.id
      );
      const departmentUsers = await usersData.getDepartmentUsers(
        user.department.id
      );
      return res.render(`services/${user.role}/edit`, {
        user,
        businessAreas,
        departmentUsers,
        errors: errorSummary,
        fieldErrors,
        values,
        csrfToken: req.csrfToken(),
      });
    }

    // Start a transaction
    await db.transaction(async (trx) => {
      // Update the service
      const serviceData = {
        name: name.trim(),
        url: url.trim(),
        business_area_id: business_area_id || null,
        service_owner_id: service_owner_id,
        rosid: rosid,
        cmdbid: cmdbid,
        updated_at: new Date(),
      };

      const updatedService = await servicesData.updateService(
        id,
        serviceData,
        trx
      );

      // Update repositories
      await serviceRepositoriesData.deleteServiceRepositories(id);

      for (const repo of repositories) {
        if (repo.url && repo.type) {
          await serviceRepositoriesData.addRepository({
            serviceId: id,
            url: repo.url.trim(),
            type: repo.type,
          });
        }
      }

      // Log the update
      await servicesData.logServiceAction(id, user.id, "update", serviceData);
    });

    res.redirect(`/services/${id}`);
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).render("error", {
      error: "There was a problem updating the service",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const assignIssue = async (req, res) => {
  try {
    const { serviceId, issueId } = req.params;
    const { assign_to, new_user_email, comment } = req.body;
    const userId = req.session.user.id;

    // Validate input
    if (!assign_to && !new_user_email) {
      return res.redirect(
        `/services/${serviceId}/issues/${issueId}/assign?error=no_user_selected`
      );
    }

    // Check if user has permission to assign issues
    const service = await db("services").where("id", serviceId).first();

    if (!service) {
      return res.redirect(`/services/${serviceId}?error=service_not_found`);
    }

    // If assigning to a new user, create the user first
    let assignedToId = assign_to;
    if (new_user_email) {
      // Check if user already exists
      let user = await db("users").where("email", new_user_email).first();

      if (!user) {
        // Create new user
        const [newUserId] = await db("users")
          .insert({
            email: new_user_email,
            department_id: service.department_id,
            role: "user",
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning("id");

        assignedToId = newUserId;
      } else {
        assignedToId = user.id;
      }
    }

    // Update the issue
    await db("issues").where("id", issueId).update({
      assigned_to: assignedToId,
      updated_at: new Date(),
    });

    // Add assignment comment
    if (comment) {
      await db("issue_comments").insert({
        issue_id: issueId,
        user_id: userId,
        comment: comment,
        created_at: new Date(),
      });
    }

    res.redirect(
      `/services/${serviceId}/issues/${issueId}?success=issue_assigned`
    );
  } catch (error) {
    console.error("Error assigning issue:", error);
    res.redirect(
      `/services/${req.params.serviceId}/issues/${req.params.issueId}?error=assign_failed`
    );
  }
};

async function assignToTeam(req, res) {
  try {
    const { serviceId, issueId } = req.params;
    const { teamId } = req.body;
    const userId = req.session.user.id;

    if (!teamId) {
      return res.redirect(
        `/services/${serviceId}/issues/${issueId}/assign?error=no_team_selected`
      );
    }

    const issue = await db("issues").where("id", issueId).first();

    if (!issue) {
      return res.redirect(`/services/${serviceId}?error=issue_not_found`);
    }

    // Check if user is a department admin for the service's department
    if (
      req.session.user.role !== "super_admin" &&
      (!req.session.user.department ||
        req.session.user.department.id !== issue.department_id)
    ) {
      return res
        .status(403)
        .send("You do not have permission to assign issues for this service.");
    }

    await db("issues").where("id", issueId).update({
      assigned_to: teamId,
      updated_at: new Date(),
    });

    // Add a comment
    const team = await db("teams").where("id", teamId).first();
    const comment = `Issue assigned to team "${team.name}" by ${req.session.user.first_name} ${req.session.user.last_name}.`;
    await db("issue_comments").insert({
      issue_id: issueId,
      user_id: userId,
      comment: comment,
      created_at: new Date(),
      user: req.session.user,
    });

    res.redirect(
      `/services/${serviceId}/issues/${issueId}?success=issue_assigned`
    );
  } catch (error) {
    console.error("Error assigning issue to team:", error);
    res.redirect(
      `/services/${req.params.serviceId}/issues/${req.params.issueId}?error=assign_failed`
    );
  }
}

// Export controller functions
module.exports = {
  index,
  newService,
  createService,
  showService,
  showServiceIssues,
  editService,
  updateService,
  assignIssue,
  assignToTeam,
};
