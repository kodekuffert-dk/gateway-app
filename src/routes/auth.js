const express = require('express');
const router = express.Router();
const { createUser, findUserByEmail, verifyPassword, isValidUcnEmail } = require('../services/authStore');
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
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.renderWithLayout('index', {
        title: 'Login',
        mode: 'login',
        error: 'Ugyldigt login',
        email,
        showMenu: false
      });
    }

    issueSession(res, user.email);
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
});

// Logout
router.get('/logout', (req, res) => {
  clearSession(res);
  res.redirect('/');
});

// GET: Email verification form
router.get('/verify', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Opret login',
    mode: 'verify',
    error: null,
    email: '',
    name: '',
    showMenu: false
  });
});

// POST: Handle email verification and password creation
router.post('/verify', async (req, res, next) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.renderWithLayout('index', {
      title: 'Opret login',
      mode: 'verify',
      error: 'Email, adgangskode og navn skal udfyldes',
      email,
      name,
      showMenu: false
    });
  }

  if (!isValidUcnEmail(email)) {
    return res.renderWithLayout('index', {
      title: 'Opret login',
      mode: 'verify',
      error: 'Brug en @ucn.dk email',
      email,
      name,
      showMenu: false
    });
  }

  try {
    const user = await createUser({
      email,
      password,
      name,
    });
    issueSession(res, user.email);
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
