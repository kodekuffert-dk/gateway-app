const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');

// Forside
router.get('/', (req, res) => {
  res.renderWithLayout('index', {
    title: 'Gateway Login',
    user: req.session.user || null,
    mode: 'login',
    error: null,
    email: '',
    showMenu: false
  });
});

// Dashboard (beskyttet)
router.get('/dashboard', authenticateStub, (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.renderWithLayout('dashboard', { title: 'Dashboard', user: req.session.user, showMenu: true });
});

module.exports = router;
