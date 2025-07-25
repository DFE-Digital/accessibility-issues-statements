exports.g_home = async(req, res, next) => {

    console.log('homepage');

    if (req.session.user) {

        if (req.session.user.role === 'user') {
            return res.redirect("/services");
        } else {
            return res.redirect("/dashboard");
        }
    }

    return res.render("index");
};