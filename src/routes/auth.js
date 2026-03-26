const express = require('express');
const router = express.Router();
const { loginUser, registerUser, confirmEmail, getProviderName } = require('../services/authStore');
const { issueSession, clearSession } = require('../middleware/jwtSession');

function buildLoginErrorMessage() {
  if (process.env.NODE_ENV === 'production') {
    return 'Ugyldigt login';
  }

  return `Ugyldigt login (auth provider: ${getProviderName()})`;
}

function buildWhitelistRejectedMessage() {
  return 'Din email er ikke whitelistet. Kontakt din kursusinstruktoer for adgang.';
}

// Login GET
router.get('/login', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Login',
    mode: 'login',
    error: null,
    success: null,
    email: '',
    showMenu: false,
  });
});

// Register GET
router.get('/register', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Opret Login',
    mode: 'register',
    error: null,
    success: null,
    email: '',
    showMenu: false,
  });
});

// Login POST
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.renderWithLayout('index', {
      title: 'Login',
      mode: 'login',
      error: 'Email og adgangskode skal udfyldes',
      success: null,
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
      success: null,
      email,
      showMenu: false
    });
  }
});

// Register POST
router.post('/register', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.renderWithLayout('index', {
      title: 'Opret Login',
      mode: 'register',
      error: 'Email og adgangskode skal udfyldes',
      success: null,
      email,
      showMenu: false,
    });
  }

  try {
    await registerUser({ email, password });

    return res.renderWithLayout('index', {
      title: 'Opret Login',
      mode: 'register',
      error: null,
      success: 'Bruger oprettet. Tjek din email og bekraeft din konto via linket.',
      email: String(email || '').trim().toLowerCase(),
      showMenu: false,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.response && error.response.status);
    const serverMessage = error.response && error.response.data && error.response.data.message;
    const looksLikeWhitelistError = statusCode === 400
      && /whitelist|not\s+whitelisted|ikke\s+whitelist/i.test(String(serverMessage || ''));

    if (looksLikeWhitelistError) {
      return res.renderWithLayout('index', {
        title: 'Opret Login',
        mode: 'register',
        error: buildWhitelistRejectedMessage(),
        success: null,
        email: String(email || '').trim().toLowerCase(),
        showMenu: false,
      });
    }

    if (statusCode === 400) {
      return res.renderWithLayout('index', {
        title: 'Opret Login',
        mode: 'register',
        error: serverMessage || 'Oprettelse mislykkedes. Proev igen.',
        success: null,
        email: String(email || '').trim().toLowerCase(),
        showMenu: false,
      });
    }

    return next(error);
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
