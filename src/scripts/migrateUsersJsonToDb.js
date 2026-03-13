const fs = require('fs');
const path = require('path');
const { query } = require('../services/db');

function deriveDefaultName(email) {
  const localPart = String(email || '').split('@')[0] || 'Bruger';
  return localPart.replace(/[._-]+/g, ' ').trim() || 'Bruger';
}

async function migrate() {
  const usersFile = process.env.USERS_FILE || path.join(__dirname, '../../data/users.json');

  if (!fs.existsSync(usersFile)) {
    console.error(`Users file not found: ${usersFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(usersFile, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  const users = Object.values(parsed || {});

  if (!Array.isArray(users) || users.length === 0) {
    console.log('No users found in users.json');
    return;
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const email = String(user && user.email ? user.email : '').trim().toLowerCase();
    const passwordHash = String(user && user.passwordHash ? user.passwordHash : '').trim();

    if (!email || !passwordHash) {
      skipped += 1;
      continue;
    }

    const existsResult = await query('SELECT email FROM users WHERE email = $1', [email]);
    const exists = existsResult.rowCount > 0;

    if (exists) {
      await query(
        'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE email = $1',
        [email, passwordHash]
      );
      updated += 1;
      continue;
    }

    await query(
      `
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, $2, $3)
      `,
      [email, passwordHash, deriveDefaultName(email)]
    );
    inserted += 1;
  }

  console.log(`Migration complete. inserted=${inserted} updated=${updated} skipped=${skipped}`);
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
