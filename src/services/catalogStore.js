const { query } = require('./db');

function normalizeNullableDate(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

async function listTeams() {
  const result = await query(
    'SELECT id, name, start_date AS "startDate", end_date AS "endDate", created_at AS "createdAt", updated_at AS "updatedAt" FROM teams ORDER BY name ASC'
  );
  return result.rows;
}

async function createTeam({ name, startDate, endDate }) {
  const result = await query(
    `
      INSERT INTO teams (name, start_date, end_date)
      VALUES ($1, $2, $3)
      RETURNING id, name, start_date AS "startDate", end_date AS "endDate"
    `,
    [String(name || '').trim(), normalizeNullableDate(startDate), normalizeNullableDate(endDate)]
  );
  return result.rows[0];
}

async function updateTeam({ id, name, startDate, endDate }) {
  const result = await query(
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

module.exports = {
  listTeams,
  createTeam,
  updateTeam,
  listCourses,
  createCourse,
  updateCourse,
};
