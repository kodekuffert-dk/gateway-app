CREATE TABLE IF NOT EXISTS team_courses (
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_team_courses_team_id ON team_courses(team_id);
CREATE INDEX IF NOT EXISTS idx_team_courses_course_id ON team_courses(course_id);

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
