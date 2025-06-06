const express = require('express');
const router = express.Router();

// Login GET
router.get('/login', (req, res) => {
  res.renderWithLayout('login', { title: 'Login' });
});

// Login POST
router.post('/login', (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.user = username;
    return res.redirect('/dashboard');
  }
  res.renderWithLayout('login', { title: 'Login', error: 'Ugyldigt brugernavn' });
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
    email: ''
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
      email
    });
  }
  // Her kan du indsætte logik til at oprette bruger og gemme password
  // For nu: Simpel mock, sæt session og redirect
  req.session.user = email;
  res.redirect('/dashboard');
});

module.exports = router;
