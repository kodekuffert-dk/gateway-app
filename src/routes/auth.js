const express = require('express');
const router = express.Router();

// Login GET
router.get('/login', (req, res) => {
  res.render('login');
});

// Login POST
router.post('/login', (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.user = username;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: 'Ugyldigt brugernavn' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
