CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS team_courses (
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_team_courses_team_id ON team_courses(team_id);
CREATE INDEX IF NOT EXISTS idx_team_courses_course_id ON team_courses(course_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'team'
  ) THEN
    INSERT INTO teams (name, start_date, end_date)
    SELECT DISTINCT team, CURRENT_DATE, NULL::date
    FROM users
    WHERE team IS NOT NULL
      AND trim(team) <> ''
      AND lower(trim(team)) <> 'ukendt'
    ON CONFLICT (name) DO NOTHING;

    UPDATE users u
    SET team_id = t.id
    FROM teams t
    WHERE u.team_id IS NULL
      AND u.team = t.name;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'courses'
  ) THEN
    INSERT INTO courses (title, description)
    SELECT DISTINCT trim(course_title), ''
    FROM users u
    CROSS JOIN LATERAL unnest(u.courses) AS course_title
    WHERE trim(course_title) <> ''
    ON CONFLICT (title) DO NOTHING;

    INSERT INTO team_courses (team_id, course_id)
    SELECT DISTINCT u.team_id, c.id
    FROM users u
    CROSS JOIN LATERAL unnest(u.courses) AS course_title
    JOIN courses c ON c.title = trim(course_title)
    WHERE trim(course_title) <> ''
      AND u.team_id IS NOT NULL
    ON CONFLICT (team_id, course_id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'user_courses'
  ) THEN
    INSERT INTO team_courses (team_id, course_id)
    SELECT DISTINCT u.team_id, uc.course_id
    FROM user_courses uc
    JOIN users u ON u.id = uc.user_id
    WHERE u.team_id IS NOT NULL
    ON CONFLICT (team_id, course_id) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS user_courses;

ALTER TABLE users DROP COLUMN IF EXISTS team;
ALTER TABLE users DROP COLUMN IF EXISTS courses;
