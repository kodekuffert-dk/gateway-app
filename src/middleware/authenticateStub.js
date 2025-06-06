function authenticateStub(req, res, next) {
  let email = undefined;
  if (req.session && req.session.user) {
    email = req.session.user;
  } else if (req.body && req.body.email) {
    email = req.body.email;
  }
  if (email && /@ucn\.dk$/i.test(email)) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = authenticateStub;
