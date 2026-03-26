require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const ejs = require('ejs');
const jwtSession = require('./middleware/jwtSession');

const app = express();
const PORT = process.env.PORT || 4000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(jwtSession);
app.use(express.static(path.join(__dirname, 'public')));

// Helper middleware til layout
app.use((req, res, next) => {
  res.renderWithLayout = (view, options = {}) => {
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    const sessionRole = req.session && req.session.role ? req.session.role : null;

    ejs.renderFile(
      path.join(__dirname, 'views', view + '.ejs'),
      {
        user: sessionUser,
        userRole: sessionRole,
        ...options,
      },
      (err, str) => {
        if (err) return next(err);
        ejs.renderFile(
          path.join(__dirname, 'views', 'layout.ejs'),
          {
            user: sessionUser,
            userRole: sessionRole,
            ...options,
            body: str,
          },
          (err2, html) => {
            if (err2) return next(err2);
            res.send(html);
          }
        );
      }
    );
  };
  next();
});

const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');

// Routing setup
// (flyttet til routes/main.js og routes/auth.js)

app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', contentRoutes);
app.use('/', adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Gateway app listening on http://localhost:${PORT}`);
});
