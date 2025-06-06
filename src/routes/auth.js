const express = require('express');
const router = express.Router();

// Login GET
router.get('/login', (req, res) => {
  res.renderWithLayout('index', { title: 'Login', mode: 'login', error: null, email: '', showMenu: false });
});

// Login POST
router.post('/login', (req, res) => {
  const { email } = req.body;
  if (email) {
    req.session.user = email;
    return res.redirect('/dashboard');
  }
  res.renderWithLayout('index', { title: 'Login', mode: 'login', error: 'Ugyldigt login', email: '', showMenu: false });
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
    title: 'Bekræft email',
    mode: 'verify',
    error: null,
    email: '',
    showMenu: false
  });
});

// POST: Handle email verification and password creation
router.post('/verify', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.renderWithLayout('index', {
      title: 'Bekræft email',
      mode: 'verify',
      error: 'Email og adgangskode skal udfyldes',
      email,
      showMenu: false
    });
  }
  // Her kan du indsætte logik til at oprette bruger og gemme password
  // For nu: Simpel mock, sæt session og redirect
  req.session.user = email;
  res.redirect('/dashboard');
});

module.exports = router;
