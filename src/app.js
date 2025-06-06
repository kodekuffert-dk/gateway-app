require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');

// Routing setup
// (flyttet til routes/main.js og routes/auth.js)

app.use('/', mainRoutes);
app.use('/', authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Gateway app listening on http://localhost:${PORT}`);
});
