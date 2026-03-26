const express = require('express');
const multer = require('multer');
const router = express.Router();
const authenticateStub = require('../middleware/authenticateStub');
const {
  listTeams,
  createTeam,
  ensureTeamByName,
  updateTeam,
  deleteTeam,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  normalizeCourseIds,
} = require('../services/catalogStore');
const { isAdminUser } = require('../utils/admin');
const { getWhitelist, addWhitelistEntries, deleteWhitelistEntries } = require('../services/whitelistStore');

const csvUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
}).single('csvFile');

function extractEmailsFromCsv(text) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = String(text || '').match(emailRegex) || [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}

function removeUtf8Bom(text) {
  const normalizedText = String(text || '');
  return normalizedText.charCodeAt(0) === 0xFEFF ? normalizedText.slice(1) : normalizedText;
}

function parseIsoDateOrNull(value, label) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new Error(`${label} skal være i formatet YYYY-MM-DD`);
  }

  const parsedDate = new Date(`${normalizedValue}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== normalizedValue) {
    throw new Error(`${label} er ugyldig`);
  }

  return normalizedValue;
}

function parseTeamImportHeader(line) {
  const headerParts = String(line || '').split(';').map((part) => part.trim());
  const teamName = headerParts[0] || '';
  const startDate = parseIsoDateOrNull(headerParts[1], 'Startdato');
  const endDate = parseIsoDateOrNull(headerParts[2], 'Slutdato');

  return { teamName, startDate, endDate };
}

function parseWhitelistImportFile(text) {
  const normalizedText = removeUtf8Bom(text);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { teamName: '', startDate: null, endDate: null, emails: [] };
  }

  const [headerLine, ...emailLines] = lines;
  const { teamName, startDate, endDate } = parseTeamImportHeader(headerLine);

  return {
    teamName,
    startDate,
    endDate,
    emails: extractEmailsFromCsv(emailLines.join('\n')),
  };
}

const ADMIN_PAGE_PATH = '/admin';
const LEGACY_CATALOG_PAGE_PATH = '/admin/catalog';
const TEAM_DETAIL_HASH = 'team-detail';
const COURSE_DETAIL_HASH = 'course-detail';
const CREATE_MODE = 'new';

function ensureAdmin(req, res) {
  if (!isAdminUser(req.session)) {
    res.status(403).send('Kun administratorer har adgang til hold- og kursusadministration');
    return false;
  }
  return true;
}

async function loadAdminData() {
  const [teams, courses, whitelistResult] = await Promise.all([
    listTeams(),
    listCourses(),
    getWhitelist()
      .then((data) => ({ data, error: null }))
      .catch((err) => ({ data: [], error: err.message })),
  ]);
  return { teams, courses, whitelist: whitelistResult.data, whitelistError: whitelistResult.error };
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

function buildAdminPageUrl({ redirectTo, teamId, courseId, userTeamName, saved = false, hash = '' } = {}) {
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

  if (userTeamName) {
    searchParams.set('userTeam', String(userTeamName));
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
      whitelist: payload.whitelist || [],
      whitelistError: payload.whitelistError || null,
      selectedTeam,
      selectedCourse,
      selectedUserTeamName: options.selectedUserTeamName || null,
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
      selectedUserTeamName: req.query.userTeam || null,
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

router.post('/admin/users/import', authenticateStub, (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  return csvUploadMiddleware(req, res, async (uploadErr) => {
    if (uploadErr) {
      return next(new Error(`Upload fejl: ${uploadErr.message}`));
    }

    if (!req.file || !req.file.buffer) {
      try {
        const render = renderAdminPage(req, res, { error: 'Ingen fil valgt', selectedUserTeamName: null });
        return render();
      } catch (error) {
        return next(error);
      }
    }

    let parsedImport = null;
    try {
      const csvText = req.file.buffer.toString('utf-8');
      parsedImport = parseWhitelistImportFile(csvText);
    } catch (error) {
      try {
        const render = renderAdminPage(req, res, {
          error: error.message,
          selectedUserTeamName: null,
        });
        return render();
      } catch (renderError) {
        return next(renderError);
      }
    }

    const {
      teamName,
      startDate,
      endDate,
      emails,
    } = parsedImport;

    if (!teamName) {
      try {
        const render = renderAdminPage(req, res, {
          error: 'Filen skal have et holdnavn på første linje',
          selectedUserTeamName: null,
        });
        return render();
      } catch (error) {
        return next(error);
      }
    }

    if (emails.length === 0) {
      try {
        const render = renderAdminPage(req, res, {
          error: 'Ingen gyldige emailadresser fundet efter første linje i filen',
          selectedUserTeamName: null,
        });
        return render();
      } catch (error) {
        return next(error);
      }
    }

    try {
      const team = await ensureTeamByName(teamName, { startDate, endDate });
      await addWhitelistEntries({ teamName: team.name, emails });
      return res.redirect(buildAdminPageUrl({
        userTeamName: team.name,
        saved: true,
        hash: 'users',
      }));
    } catch (error) {
      return next(error);
    }
  });
});

router.post('/admin/users/delete', authenticateStub, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const teamName = String((req.body && req.body.teamName) || '').trim();

  if (!email) {
    try {
      const render = renderAdminPage(req, res, {
        error: 'Email mangler for sletning',
        selectedUserTeamName: teamName || null,
      });
      return render();
    } catch (error) {
      return next(error);
    }
  }

  try {
    await deleteWhitelistEntries({ emails: [email] });
    return res.redirect(buildAdminPageUrl({
      userTeamName: teamName || null,
      saved: true,
      hash: 'users',
    }));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
