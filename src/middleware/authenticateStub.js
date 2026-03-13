function authenticateStub(req, res, next) {
  const email = req.session && req.session.user;
  if (email && /@ucn\.dk$/i.test(email)) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = authenticateStub;
