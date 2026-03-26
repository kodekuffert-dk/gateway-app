const express = require('express');
const router = express.Router();
const { loginUser, confirmEmail, getProviderName } = require('../services/authStore');
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

// Email-bekræftelse — kaldt via link i bekræftelsesmail til brugeren
router.get('/confirm-email', async (req, res, next) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.renderWithLayout('confirm-email', {
      title: 'Bekræft email',
      success: false,
      message: 'Ugyldigt bekræftelseslink. Token og email skal angives.',
      showMenu: false,
    });
  }

  try {
    await confirmEmail({ token, email });
    return res.renderWithLayout('confirm-email', {
      title: 'Bekræft email',
      success: true,
      message: 'Din email er bekræftet. Du kan nu logge ind.',
      showMenu: false,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.response && error.response.status);
    const serverMessage = error.response && error.response.data && error.response.data.message;

    if (statusCode === 400 || statusCode === 404) {
      return res.renderWithLayout('confirm-email', {
        title: 'Bekræft email',
        success: false,
        message: serverMessage || 'Ugyldigt eller udløbet bekræftelseslink.',
        showMenu: false,
      });
    }

    return next(error);
  }
});

module.exports = router;
