const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');
const {
  listTeams,
  createTeam,
  updateTeam,
  listCourses,
  createCourse,
  updateCourse,
  normalizeCourseIds,
} = require('../services/catalogStore');
const { isAdminUser } = require('../utils/admin');

const ADMIN_PAGE_PATH = '/admin';
const LEGACY_CATALOG_PAGE_PATH = '/admin/catalog';

function ensureAdmin(req, res) {
  if (!isAdminUser(req.session.user)) {
    res.status(403).send('Kun administratorer har adgang til hold- og kursusadministration');
    return false;
  }
  return true;
}

async function loadAdminData() {
  const [teams, courses] = await Promise.all([
    listTeams(),
    listCourses(),
  ]);
  return { teams, courses };
}

function renderAdminPage(req, res, options = {}) {
  return async (data = null) => {
    const payload = data || await loadAdminData();
    return res.renderWithLayout('admin-settings', {
      title: 'Administration',
      user: req.session.user,
      isAdmin: true,
      showMenu: true,
      pageStyles: ['/admin-settings.css'],
      teams: payload.teams,
      courses: payload.courses,
      success: options.success || null,
      error: options.error || null,
    });
  };
}

function resolveRedirectPath(redirectTo, fallbackPath) {
  if (redirectTo === ADMIN_PAGE_PATH || redirectTo === LEGACY_CATALOG_PAGE_PATH) {
    return ADMIN_PAGE_PATH;
  }
  return fallbackPath;
}

router.get('/admin', authenticateStub, async (req, res, next) => {
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

router.get('/admin/catalog', authenticateStub, (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const query = req.query && req.query.saved ? '?saved=1' : '';
  return res.redirect(`${ADMIN_PAGE_PATH}${query}`);
});

router.post('/admin/teams/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { name, startDate, endDate } = req.body || {};
  const courseIds = normalizeCourseIds(req.body && req.body.courseIds);
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, ADMIN_PAGE_PATH);
  if (!name || !startDate) {
    try {
      const render = renderAdminPage(req, res, { error: 'Holdnavn og startdato skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await createTeam({ name, startDate, endDate, courseIds });
    return res.redirect(`${redirectPath}?saved=1`);
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teams/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id, name, startDate, endDate } = req.body || {};
  const courseIds = normalizeCourseIds(req.body && req.body.courseIds);
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, ADMIN_PAGE_PATH);
  if (!id || !name || !startDate) {
    try {
      const render = renderAdminPage(req, res, { error: 'Team-id, navn og startdato skal udfyldes' });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await updateTeam({ id: Number(id), name, startDate, endDate, courseIds });
    return res.redirect(`${redirectPath}?saved=1`);
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { title, description } = req.body || {};
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, ADMIN_PAGE_PATH);
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
    return res.redirect(`${redirectPath}?saved=1`);
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id, title, description } = req.body || {};
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, ADMIN_PAGE_PATH);
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
    return res.redirect(`${redirectPath}?saved=1`);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
