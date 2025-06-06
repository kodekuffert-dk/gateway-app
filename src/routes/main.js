const express = require('express');
const router = express.Router();

// Forside
router.get('/', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Gateway Login',
    user: req.session.user || null,
    mode: 'login',
    error: null,
    email: ''
  });
});

// Dashboard (beskyttet)
router.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.renderWithLayout('dashboard', { title: 'Dashboard', user: req.session.user });
});

module.exports = router;
