const express = require('express');
const router = express.Router();
const { loginUser, isValidUcnEmail } = require('../services/authStore');
const { issueSession, clearSession } = require('../middleware/jwtSession');

// Login GET
router.get('/login', (req, res) => {
  res.renderWithLayout('index', { title: 'Login', mode: 'login', error: null, email: '', showMenu: false });
});

// Login POST
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: 'Email og adgangskode skal udfyldes',
      email,
      showMenu: false
    });
  }

  if (!isValidUcnEmail(email)) {
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: 'Brug en @ucn.dk email',
      email,
      showMenu: false
    });
  }

  try {
    const user = await loginUser({ email, password });

    issueSession(res, user.email);
    return res.redirect('/dashboard');
  } catch (error) {
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: 'Ugyldigt login',
      email,
      showMenu: false
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  clearSession(res);
  res.redirect('/');
});

module.exports = router;
