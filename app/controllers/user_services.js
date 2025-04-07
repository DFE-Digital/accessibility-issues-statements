const { getUserServices } = require('../data/services');

const index = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const user = req.session.user;
    const services = await getUserServices(user.id);

    res.render('services/user/index', {
      services,
      user
    });
  } catch (error) {
    console.error('User services error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading your services',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const showService = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/sign-in');
    }

    const { serviceId } = req.params;
    const user = req.session.user;
    const services = await getUserServices(user.id);
    const service = services.find(s => s.id === serviceId);

    if (!service) {
      return res.status(404).render('error', {
        error: 'Service not found',
        details: 'The service you are looking for could not be found in your list of services'
      });
    }

    res.render('services/user/show', {
      service,
      user
    });
  } catch (error) {
    console.error('User service error:', error);
    res.status(500).render('error', {
      error: 'There was a problem loading the service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  index,
  showService
}; 