const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');
const { listUsers, updateUser } = require('../services/authStore');
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

const USERS_PAGE_PATH = '/admin/users';
const CATALOG_PAGE_PATH = '/admin/catalog';

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

function renderCatalogPage(req, res, options = {}) {
  return async (data = null) => {
    const payload = data || await loadAdminData();
    return res.renderWithLayout('admin-catalog', {
      title: 'Hold og Kurser',
      user: req.session.user,
      isAdmin: true,
      showMenu: true,
      teams: payload.teams,
      courses: payload.courses,
      success: options.success || null,
      error: options.error || null,
    });
  };
}

function resolveRedirectPath(redirectTo, fallbackPath) {
  if (redirectTo === CATALOG_PAGE_PATH || redirectTo === USERS_PAGE_PATH) {
    return redirectTo;
  }
  return fallbackPath;
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

router.get('/admin/catalog', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  try {
    const success = req.query.saved ? 'Data gemt' : null;
    const render = renderCatalogPage(req, res, { success });
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
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, USERS_PAGE_PATH);

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
      password,
    });

    if (!updated) {
      const render = renderAdminPage(req, res, { error: 'Brugeren blev ikke fundet' });
      return render();
    }

    return res.redirect(`${redirectPath}?saved=1`);
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teams/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { name, startDate, endDate } = req.body || {};
  const courseIds = normalizeCourseIds(req.body && req.body.courseIds);
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, CATALOG_PAGE_PATH);
  if (!name || !startDate) {
    try {
      const render = redirectPath === CATALOG_PAGE_PATH
        ? renderCatalogPage(req, res, { error: 'Holdnavn og startdato skal udfyldes' })
        : renderAdminPage(req, res, { error: 'Holdnavn og startdato skal udfyldes' });
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
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, CATALOG_PAGE_PATH);
  if (!id || !name || !startDate) {
    try {
      const render = redirectPath === CATALOG_PAGE_PATH
        ? renderCatalogPage(req, res, { error: 'Team-id, navn og startdato skal udfyldes' })
        : renderAdminPage(req, res, { error: 'Team-id, navn og startdato skal udfyldes' });
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
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, CATALOG_PAGE_PATH);
  if (!title) {
    try {
      const render = redirectPath === CATALOG_PAGE_PATH
        ? renderCatalogPage(req, res, { error: 'Kurstitel skal udfyldes' })
        : renderAdminPage(req, res, { error: 'Kurstitel skal udfyldes' });
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
  const redirectPath = resolveRedirectPath(req.body && req.body.redirectTo, CATALOG_PAGE_PATH);
  if (!id || !title) {
    try {
      const render = redirectPath === CATALOG_PAGE_PATH
        ? renderCatalogPage(req, res, { error: 'Kursus-id og titel skal udfyldes' })
        : renderAdminPage(req, res, { error: 'Kursus-id og titel skal udfyldes' });
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
