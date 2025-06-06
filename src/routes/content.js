const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');

// Øvelser
router.get('/exercises', authenticateStub, (req, res) => {
  res.renderWithLayout('exercises', {
    title: 'Øvelser',
    user: req.session.user,
    showMenu: true
  });
});

// Tests
router.get('/tests', authenticateStub, (req, res) => {
  res.renderWithLayout('tests', {
    title: 'Tests',
    user: req.session.user,
    showMenu: true
  });
});

// Artikler
router.get('/articles', authenticateStub, (req, res) => {
  res.renderWithLayout('articles', {
    title: 'Artikler',
    user: req.session.user,
    showMenu: true
  });
});

module.exports = router;
