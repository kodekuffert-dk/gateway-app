const express = require('express');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');
const {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  normalizeCourseIds,
} = require('../services/catalogStore');
const { isAdminUser } = require('../utils/admin');

const ADMIN_PAGE_PATH = '/admin';
const LEGACY_CATALOG_PAGE_PATH = '/admin/catalog';
const TEAM_DETAIL_HASH = 'team-detail';
const COURSE_DETAIL_HASH = 'course-detail';
const CREATE_MODE = 'new';

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

function resolvePositiveInteger(value) {
  const parsedValue = Number(value);
  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }
  return null;
}

function resolveSelectedRecord(records, selectedId) {
  if (!records.length) {
    return null;
  }

  const normalizedId = resolvePositiveInteger(selectedId);
  if (normalizedId === null) {
    return records[0];
  }

  return records.find((record) => Number(record.id) === normalizedId) || records[0];
}

function isCreateMode(value) {
  return value === CREATE_MODE;
}

function buildAdminPageUrl({ redirectTo, teamId, courseId, saved = false, hash = '' } = {}) {
  const pathname = redirectTo === LEGACY_CATALOG_PAGE_PATH ? ADMIN_PAGE_PATH : ADMIN_PAGE_PATH;
  const searchParams = new URLSearchParams();

  if (teamId === CREATE_MODE) {
    searchParams.set('team', CREATE_MODE);
  } else if (resolvePositiveInteger(teamId) !== null) {
    searchParams.set('team', String(teamId));
  }

  if (courseId === CREATE_MODE) {
    searchParams.set('course', CREATE_MODE);
  } else if (resolvePositiveInteger(courseId) !== null) {
    searchParams.set('course', String(courseId));
  }

  if (saved) {
    searchParams.set('saved', '1');
  }

  const query = searchParams.toString();
  const fragment = hash ? `#${hash}` : '';
  return `${pathname}${query ? `?${query}` : ''}${fragment}`;
}

function renderAdminPage(req, res, options = {}) {
  return async (data = null) => {
    const payload = data || await loadAdminData();
    const isCreatingTeam = isCreateMode(options.selectedTeamId);
    const isCreatingCourse = isCreateMode(options.selectedCourseId);
    const selectedTeam = isCreatingTeam ? null : resolveSelectedRecord(payload.teams, options.selectedTeamId);
    const selectedCourse = isCreatingCourse ? null : resolveSelectedRecord(payload.courses, options.selectedCourseId);

    return res.renderWithLayout('admin-settings', {
      title: 'Administration',
      user: req.session.user,
      isAdmin: true,
      showMenu: true,
      pageStyles: ['/admin-settings.css'],
      pageScripts: ['/admin-settings.js'],
      teams: payload.teams,
      courses: payload.courses,
      selectedTeam,
      selectedCourse,
      isCreatingTeam,
      isCreatingCourse,
      success: options.success || null,
      error: options.error || null,
    });
  };
}

router.get('/admin', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  try {
    const success = req.query.saved ? 'Data gemt' : null;
    const render = renderAdminPage(req, res, {
      success,
      selectedTeamId: req.query.team,
      selectedCourseId: req.query.course,
    });
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
  const selectedCourseId = req.body && req.body.selectedCourseId;
  if (!name || !startDate) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Holdnavn og startdato skal udfyldes',
        selectedTeamId: CREATE_MODE,
        selectedCourseId,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    const team = await createTeam({ name, startDate, endDate, courseIds });
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      teamId: team && team.id,
      courseId: selectedCourseId,
      saved: true,
      hash: TEAM_DETAIL_HASH,
    }));
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
  const selectedCourseId = req.body && req.body.selectedCourseId;
  if (!id || !name || !startDate) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Team-id, navn og startdato skal udfyldes',
        selectedTeamId: id,
        selectedCourseId,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await updateTeam({ id: Number(id), name, startDate, endDate, courseIds });
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      teamId: id,
      courseId: selectedCourseId,
      saved: true,
      hash: TEAM_DETAIL_HASH,
    }));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/teams/delete', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const id = resolvePositiveInteger(req.body && req.body.id);
  const selectedCourseId = req.body && req.body.selectedCourseId;
  if (!id) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Team-id mangler for sletning',
        selectedCourseId,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await deleteTeam(id);
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      courseId: selectedCourseId,
      saved: true,
      hash: 'teams',
    }));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/create', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { title, description } = req.body || {};
  const selectedTeamId = req.body && req.body.selectedTeamId;
  if (!title) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Kurstitel skal udfyldes',
        selectedCourseId: CREATE_MODE,
        selectedTeamId,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    const course = await createCourse({ title, description });
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      teamId: selectedTeamId,
      courseId: course && course.id,
      saved: true,
      hash: COURSE_DETAIL_HASH,
    }));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/update', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id, title, description } = req.body || {};
  const selectedTeamId = req.body && req.body.selectedTeamId;
  if (!id || !title) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Kursus-id og titel skal udfyldes',
        selectedTeamId,
        selectedCourseId: id,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await updateCourse({ id: Number(id), title, description });
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      teamId: selectedTeamId,
      courseId: id,
      saved: true,
      hash: COURSE_DETAIL_HASH,
    }));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/courses/delete', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const id = resolvePositiveInteger(req.body && req.body.id);
  const selectedTeamId = req.body && req.body.selectedTeamId;
  if (!id) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Kursus-id mangler for sletning',
        selectedTeamId,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await deleteCourse(id);
    return res.redirect(buildAdminPageUrl({
      redirectTo: req.body && req.body.redirectTo,
      teamId: selectedTeamId,
      saved: true,
      hash: 'courses',
    }));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
