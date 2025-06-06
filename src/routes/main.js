const express = require('express');
const router = express.Router();

// Forside
router.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// Dashboard (beskyttet)
router.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { user: req.session.user });
});

module.exports = router;
