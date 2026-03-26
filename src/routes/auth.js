const express = require('express');
const router = express.Router();
const { loginUser, getProviderName } = require('../services/authStore');
const { issueSession, clearSession } = require('../middleware/jwtSession');

function buildLoginErrorMessage() {
  if (process.env.NODE_ENV === 'production') {
    return 'Ugyldigt login';
  }

  return `Ugyldigt login (auth provider: ${getProviderName()})`;
}

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

  try {
    const user = await loginUser({ email, password });

    issueSession(res, user);
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: buildLoginErrorMessage(),
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
