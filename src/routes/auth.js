const express = require('express');
const router = express.Router();
const { createUser, findUserByEmail, verifyPassword, isValidUcnEmail } = require('../services/authStore');

// Login GET
router.get('/login', (req, res) => {
  res.renderWithLayout('index', { title: 'Login', mode: 'login', error: null, email: '', showMenu: false });
});

// Login POST
router.post('/login', (req, res) => {
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

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: 'Ugyldigt login',
      email,
      showMenu: false
    });
  }

  req.session.user = user.email;
  return res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// GET: Email verification form
router.get('/verify', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Opret login',
    mode: 'verify',
    error: null,
    email: '',
    showMenu: false
  });
});

// POST: Handle email verification and password creation
router.post('/verify', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.renderWithLayout('index', {
      title: 'Opret login',
      mode: 'verify',
      error: 'Email og adgangskode skal udfyldes',
      email,
      showMenu: false
    });
  }

  if (!isValidUcnEmail(email)) {
    return res.renderWithLayout('index', {
      title: 'Opret login',
      mode: 'verify',
      error: 'Brug en @ucn.dk email',
      email,
      showMenu: false
    });
  }

  const user = createUser(email, password);
  req.session.user = user.email;
  res.redirect('/dashboard');
});

module.exports = router;
