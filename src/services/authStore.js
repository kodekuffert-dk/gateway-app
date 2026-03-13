const crypto = require('crypto');
const { query, withTransaction } = require('./db');

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidUcnEmail(email) {
  return /@ucn\.dk$/i.test(email || '');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, storedKeyHex] = storedHash.split(':');
  const derivedKeyHex = crypto.scryptSync(password, salt, 64).toString('hex');

  const storedKey = Buffer.from(storedKeyHex, 'hex');
  const derivedKey = Buffer.from(derivedKeyHex, 'hex');

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKey, derivedKey);
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

async function createUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || '').trim();
  const passwordHash = hashPassword(password);

  const sql = `
    INSERT INTO users (email, password_hash, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (email)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING email, password_hash AS "passwordHash", name, team_id AS "teamId"
  `;

  const result = await query(sql, [normalizedEmail, passwordHash, normalizedName]);

  return result.rows[0];
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const result = await query(
    'SELECT email, password_hash AS "passwordHash", name, team_id AS "teamId" FROM users WHERE email = $1',
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

async function listUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.team_id AS "teamId",
        t.name AS "teamName",
        COALESCE(ARRAY_AGG(uc.course_id) FILTER (WHERE uc.course_id IS NOT NULL), '{}') AS "courseIds",
        COALESCE(ARRAY_AGG(c.title) FILTER (WHERE c.title IS NOT NULL), '{}') AS courses,
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt"
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      LEFT JOIN user_courses uc ON uc.user_id = u.id
      LEFT JOIN courses c ON c.id = uc.course_id
      GROUP BY u.id, t.id
      ORDER BY u.email ASC
    `
  );

  return result.rows;
}

async function updateUser({ email, name, teamId, courseIds, password }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || '').trim();
  const parsedTeamId = teamId ? Number(teamId) : null;
  const normalizedTeamId = Number.isInteger(parsedTeamId) && parsedTeamId > 0 ? parsedTeamId : null;
  const normalizedCourseIds = normalizeCourseIds(courseIds);

  return withTransaction(async (client) => {
    const userLookup = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userLookup.rowCount === 0) {
      return null;
    }

    const userId = userLookup.rows[0].id;

    if (password && String(password).trim()) {
      const passwordHash = hashPassword(String(password));
      await client.query(
        `
          UPDATE users
          SET name = $2,
              team_id = $3,
              password_hash = $4,
              updated_at = NOW()
          WHERE email = $1
        `,
        [normalizedEmail, normalizedName, normalizedTeamId, passwordHash]
      );
    } else {
      await client.query(
        `
          UPDATE users
          SET name = $2,
              team_id = $3,
              updated_at = NOW()
          WHERE email = $1
        `,
        [normalizedEmail, normalizedName, normalizedTeamId]
      );
    }

    await client.query('DELETE FROM user_courses WHERE user_id = $1', [userId]);
    for (const courseId of normalizedCourseIds) {
      await client.query(
        'INSERT INTO user_courses (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, courseId]
      );
    }

    const updated = await client.query(
      `
        SELECT
          u.email,
          u.name,
          u.team_id AS "teamId",
          t.name AS "teamName",
          COALESCE(ARRAY_AGG(uc.course_id) FILTER (WHERE uc.course_id IS NOT NULL), '{}') AS "courseIds",
          COALESCE(ARRAY_AGG(c.title) FILTER (WHERE c.title IS NOT NULL), '{}') AS courses,
          u.created_at AS "createdAt",
          u.updated_at AS "updatedAt"
        FROM users u
        LEFT JOIN teams t ON t.id = u.team_id
        LEFT JOIN user_courses uc ON uc.user_id = u.id
        LEFT JOIN courses c ON c.id = uc.course_id
        WHERE u.id = $1
        GROUP BY u.id, t.id
      `,
      [userId]
    );

    return updated.rows[0] || null;
  });
}

module.exports = {
  createUser,
  findUserByEmail,
  listUsers,
  updateUser,
  verifyPassword,
  isValidUcnEmail,
  normalizeCourseIds,
};
