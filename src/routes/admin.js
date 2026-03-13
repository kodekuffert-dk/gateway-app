const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');
const { listUsers, updateUser, normalizeCourseIds } = require('../services/authStore');
const {
  listTeams,
  createTeam,
  updateTeam,
  listCourses,
  createCourse,
  updateCourse,
} = require('../services/catalogStore');
const { isAdminUser } = require('../utils/admin');

function ensureAdmin(req, res) {
  if (!isAdminUser(req.session.user)) {
    res.status(403).send('Kun administratorer har adgang til brugeradministration');
    return false;
  }
  return true;
}

async function loadAdminData() {
  const [users, teams, courses] = await Promise.all([
    listUsers(),
    listTeams(),
    listCourses(),
  ]);
  return { users, teams, courses };
}

function renderAdminPage(req, res, options = {}) {
  return async (data = null) => {
    const payload = data || await loadAdminData();
    return res.renderWithLayout('admin-users', {
      title: 'Brugeradministration',
      user: req.session.user,
      isAdmin: true,
      showMenu: true,
      users: payload.users,
      teams: payload.teams,
      courses: payload.courses,
      success: options.success || null,
      error: options.error || null,
    });
  };
}

router.get('/admin/users', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  try {
    const success = req.query.saved ? 'Data gemt' : null;
    const render = renderAdminPage(req, res, { success });
    return render();
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/users/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { email, name, teamId, password } = req.body || {};
  const courseIds = normalizeCourseIds(req.body && req.body.courseIds);

  if (!email || !name) {
    try {
      const render = renderAdminPage(req, res, { error: 'Email og navn skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    const updated = await updateUser({
      email,
      name,
      teamId,
      courseIds,
      password,
    });

    if (!updated) {
      const render = renderAdminPage(req, res, { error: 'Brugeren blev ikke fundet' });
      return render();
    }

    return res.redirect('/admin/users?saved=1');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teams/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { name, startDate, endDate } = req.body || {};
  if (!name || !startDate) {
    try {
      const render = renderAdminPage(req, res, { error: 'Holdnavn og startdato skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await createTeam({ name, startDate, endDate });
    return res.redirect('/admin/users?saved=1');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teams/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id, name, startDate, endDate } = req.body || {};
  if (!id || !name || !startDate) {
    try {
      const render = renderAdminPage(req, res, { error: 'Team-id, navn og startdato skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await updateTeam({ id: Number(id), name, startDate, endDate });
    return res.redirect('/admin/users?saved=1');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { title, description } = req.body || {};
  if (!title) {
    try {
      const render = renderAdminPage(req, res, { error: 'Kurstitel skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await createCourse({ title, description });
    return res.redirect('/admin/users?saved=1');
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id, title, description } = req.body || {};
  if (!id || !title) {
    try {
      const render = renderAdminPage(req, res, { error: 'Kursus-id og titel skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await updateCourse({ id: Number(id), title, description });
    return res.redirect('/admin/users?saved=1');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
