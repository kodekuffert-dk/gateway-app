function normalizeNullableDate(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function normalizeTeamName(value) {
  return String(value || '').trim();
}

function getDefaultTeamStartDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCourseIds(courseIdsInput) {
  if (!Array.isArray(courseIdsInput)) {
    if (!courseIdsInput) {
      return [];
    }
    return [Number(courseIdsInput)].filter((id) => Number.isInteger(id) && id > 0);
  }

  return courseIdsInput
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function nowIso() {
  return new Date().toISOString();
}

// Returnerer en catalog-provider med samme kontrakt som service-provideren.
// Data ligger i hukommelsen og nulstilles ved genstart.
function createDummyCatalogProvider() {
  let nextTeamId = 3;
  let nextCourseId = 3;

  const courses = [
    {
      id: 1,
      title: 'Introduktion til IT-sikkerhed',
      description: 'Grundlaeggende begreber inden for IT-sikkerhed og trusselsbilleder.',
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'SSDLC og sikker softwareudvikling',
      description: 'Integrering af sikkerhed i hele softwareudviklingslivscyklussen.',
      createdAt: '2026-01-15T10:01:00.000Z',
      updatedAt: '2026-01-15T10:01:00.000Z',
    },
  ];

  const teams = [
    {
      id: 1,
      name: 'Hold A - Foraar 2026',
      startDate: '2026-02-01',
      endDate: '2026-06-30',
      courseIds: [1, 2],
      createdAt: '2026-01-20T09:00:00.000Z',
      updatedAt: '2026-01-20T09:00:00.000Z',
    },
    {
      id: 2,
      name: 'Hold B - Efteraar 2026',
      startDate: '2026-08-15',
      endDate: null,
      courseIds: [1],
      createdAt: '2026-01-20T09:05:00.000Z',
      updatedAt: '2026-01-20T09:05:00.000Z',
    },
  ];

  function courseTitleById(id) {
    const course = courses.find((c) => c.id === id);
    return course ? course.title : null;
  }

  function toTeamPayload(team) {
    return {
      id: team.id,
      name: team.name,
      startDate: team.startDate,
      endDate: team.endDate,
      courseIds: [...team.courseIds],
      courses: team.courseIds.map(courseTitleById).filter(Boolean),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  function sortedCourses() {
    return [...courses].sort((a, b) => String(a.title).localeCompare(String(b.title), 'da'));
  }

  function sortedTeams() {
    return [...teams].sort((a, b) => String(a.name).localeCompare(String(b.name), 'da'));
  }

  return {
    async listTeams() {
      return sortedTeams().map(toTeamPayload);
    },

    async findTeamByName(name) {
      const normalizedName = normalizeTeamName(name);
      if (!normalizedName) return null;
      const team = teams.find((t) => t.name.toLowerCase() === normalizedName.toLowerCase()) || null;
      return team ? toTeamPayload(team) : null;
    },

    async createTeam({ name, startDate, endDate, courseIds }) {
      const normalizedCourseIds = normalizeCourseIds(courseIds);
      const createdAt = nowIso();
      const team = {
        id: nextTeamId++,
        name: normalizeTeamName(name),
        startDate: normalizeNullableDate(startDate),
        endDate: normalizeNullableDate(endDate),
        courseIds: normalizedCourseIds,
        createdAt,
        updatedAt: createdAt,
      };
      teams.push(team);
      return toTeamPayload(team);
    },

    async ensureTeamByName(name, defaults = {}) {
      const normalizedName = normalizeTeamName(name);
      if (!normalizedName) {
        throw new Error('Holdnavn mangler');
      }

      const existing = teams.find((t) => t.name.toLowerCase() === normalizedName.toLowerCase());
      if (existing) {
        return toTeamPayload(existing);
      }

      const createdAt = nowIso();
      const team = {
        id: nextTeamId++,
        name: normalizedName,
        startDate: normalizeNullableDate(defaults.startDate) || getDefaultTeamStartDate(),
        endDate: normalizeNullableDate(defaults.endDate),
        courseIds: [],
        createdAt,
        updatedAt: createdAt,
      };
      teams.push(team);
      return toTeamPayload(team);
    },

    async updateTeam({ id, name, startDate, endDate, courseIds }) {
      const idx = teams.findIndex((t) => t.id === Number(id));
      if (idx === -1) return null;

      teams[idx] = {
        ...teams[idx],
        name: normalizeTeamName(name),
        startDate: normalizeNullableDate(startDate),
        endDate: normalizeNullableDate(endDate),
        courseIds: normalizeCourseIds(courseIds),
        updatedAt: nowIso(),
      };

      return toTeamPayload(teams[idx]);
    },

    async deleteTeam(id) {
      const idx = teams.findIndex((t) => t.id === Number(id));
      if (idx === -1) return null;
      const deleted = teams[idx];
      teams.splice(idx, 1);
      return { id: deleted.id };
    },

    async listCourses() {
      return sortedCourses().map((course) => ({ ...course }));
    },

    async createCourse({ title, description }) {
      const createdAt = nowIso();
      const course = {
        id: nextCourseId++,
        title: String(title || '').trim(),
        description: String(description || '').trim(),
        createdAt,
        updatedAt: createdAt,
      };
      courses.push(course);
      return { ...course };
    },

    async updateCourse({ id, title, description }) {
      const idx = courses.findIndex((c) => c.id === Number(id));
      if (idx === -1) return null;
      courses[idx] = {
        ...courses[idx],
        title: String(title || '').trim(),
        description: String(description || '').trim(),
        updatedAt: nowIso(),
      };
      return { ...courses[idx] };
    },

    async deleteCourse(id) {
      const numericId = Number(id);
      const idx = courses.findIndex((c) => c.id === numericId);
      if (idx === -1) return null;
      const deleted = courses[idx];
      courses.splice(idx, 1);

      for (let i = 0; i < teams.length; i += 1) {
        teams[i].courseIds = teams[i].courseIds.filter((courseId) => courseId !== numericId);
        teams[i].updatedAt = nowIso();
      }

      return { id: deleted.id };
    },

    normalizeCourseIds,
  };
}

module.exports = {
  createDummyCatalogProvider,
  normalizeCourseIds,
};
