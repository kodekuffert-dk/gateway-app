const { query, withTransaction } = require('./db');

function normalizeNullableDate(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

async function listTeams() {
  const result = await query(
    `
      SELECT
        t.id,
        t.name,
        t.start_date AS "startDate",
        t.end_date AS "endDate",
        COALESCE(ARRAY_AGG(tc.course_id) FILTER (WHERE tc.course_id IS NOT NULL), '{}') AS "courseIds",
        COALESCE(ARRAY_AGG(c.title) FILTER (WHERE c.title IS NOT NULL), '{}') AS courses,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt"
      FROM teams t
      LEFT JOIN team_courses tc ON tc.team_id = t.id
      LEFT JOIN courses c ON c.id = tc.course_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `
  );
  return result.rows;
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

async function createTeam({ name, startDate, endDate, courseIds }) {
  const normalizedCourseIds = normalizeCourseIds(courseIds);
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `
        INSERT INTO teams (name, start_date, end_date)
        VALUES ($1, $2, $3)
        RETURNING id, name, start_date AS "startDate", end_date AS "endDate"
      `,
      [String(name || '').trim(), normalizeNullableDate(startDate), normalizeNullableDate(endDate)]
    );
    const team = inserted.rows[0];

    for (const courseId of normalizedCourseIds) {
      await client.query(
        'INSERT INTO team_courses (team_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [team.id, courseId]
      );
    }

    return team;
  });
}

async function updateTeam({ id, name, startDate, endDate, courseIds }) {
  const normalizedCourseIds = normalizeCourseIds(courseIds);
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE teams
        SET name = $2,
            start_date = $3,
            end_date = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, start_date AS "startDate", end_date AS "endDate"
      `,
      [id, String(name || '').trim(), normalizeNullableDate(startDate), normalizeNullableDate(endDate)]
    );

    if (result.rowCount === 0) {
      return null;
    }

    await client.query('DELETE FROM team_courses WHERE team_id = $1', [id]);
    for (const courseId of normalizedCourseIds) {
      await client.query(
        'INSERT INTO team_courses (team_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, courseId]
      );
    }

    return result.rows[0];
  });
}

async function deleteTeam(id) {
  const result = await query('DELETE FROM teams WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

async function listCourses() {
  const result = await query(
    'SELECT id, title, description, created_at AS "createdAt", updated_at AS "updatedAt" FROM courses ORDER BY title ASC'
  );
  return result.rows;
}

async function createCourse({ title, description }) {
  const result = await query(
    `
      INSERT INTO courses (title, description)
      VALUES ($1, $2)
      RETURNING id, title, description
    `,
    [String(title || '').trim(), String(description || '').trim()]
  );
  return result.rows[0];
}

async function updateCourse({ id, title, description }) {
  const result = await query(
    `
      UPDATE courses
      SET title = $2,
          description = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, title, description
    `,
    [id, String(title || '').trim(), String(description || '').trim()]
  );
  return result.rows[0] || null;
}

async function deleteCourse(id) {
  const result = await query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  normalizeCourseIds,
};
