const { getUserServices, getService } = require("../data/services");
const businessAreasData = require("../data/business_areas");
const db = require("../db");

const index = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/auth/sign-in");
    }

    const user = req.session.user;

    // Get filter parameters from query string
    const filters = {
      search: req.query.search || "",
      business_areas: req.query.business_areas
        ? Array.isArray(req.query.business_areas)
          ? req.query.business_areas
          : [req.query.business_areas]
        : [],
      has_issues: req.query.has_issues || "",
      no_issues: req.query.no_issues || "",
      enrolled: req.query.enrolled || "",
      not_enrolled: req.query.not_enrolled || "",
    };

    console.log("User services controller filters:", filters);

    // Get services with filters
    const services = await getUserServices(user.id, filters);

    // Get business areas for the department
    const business_areas = await businessAreasData.getDepartmentBusinessAreas(
      user.department.id
    );

    // Ensure user object has department info
    if (!user.department) {
      const department = await db("departments")
        .select("*")
        .where("id", user.department_id)
        .first();

      user.department = department;
    }

    res.render("services/user/index", {
      services: services || [],
      user,
      filters,
      business_areas,
    });
  } catch (error) {
    console.error("User services error:", error);
    res.status(500).render("error", {
      error: "There was a problem loading your services",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const showService = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/auth/sign-in");
    }

    const { serviceId } = req.params;
    const user = req.session.user;
    // Fetch the service by ID directly
    const service = await getService(serviceId);
    // Optionally, check department ownership or user access here
    if (!service || service.department_id !== user.department.id) {
      return res.status(404).render("error", {
        error: "Service not found",
        details:
          "The service you are looking for could not be found in your list of services",
      });
    }

    res.render("services/user/show", {
      service,
      user,
    });
  } catch (error) {
    console.error("User service error:", error);
    res.status(500).render("error", {
      error: "There was a problem loading the service",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  index,
  showService,
};
