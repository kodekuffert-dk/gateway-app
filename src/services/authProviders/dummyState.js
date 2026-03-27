const crypto = require('crypto');

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

const dummyUsers = [
  {
    id: 'd36fda89-4c0f-4d8a-92b5-4d359f46b9df',
    email: 'admin@kodekuffert.dk',
    password: 'kodekuffert123',
    role: 'Administrator',
    isEmailConfirmed: true,
    isActive: true,
  },
  {
    id: '38dcf97f-d2fa-4b67-af32-25366c83d3cb',
    email: 'student@ucn.dk',
    password: 'kodekuffert123',
    role: 'Student',
    isEmailConfirmed: true,
    isActive: true,
  },
];

// Delt in-memory whitelist til dummy-mode.
const dummyWhitelist = [];

// Midlertidige oprettelser, der afventer email-bekræftelse.
const pendingRegistrations = [];

function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return dummyUsers.find((entry) => entry.email === normalizedEmail) || null;
}

function findWhitelistEntryByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  for (const team of dummyWhitelist) {
    const entry = team.emails.find((item) => normalizeEmail(item.email) === normalizedEmail);
    if (entry) {
      return { team, entry };
    }
  }
  return null;
}

function getWhitelistEntryByEmail(email) {
  const match = findWhitelistEntryByEmail(email);
  if (!match) {
    return null;
  }

  return {
    teamName: match.team.teamName,
    status: match.entry.status,
    email: normalizeEmail(match.entry.email),
  };
}

function isWhitelisted(email) {
  return Boolean(findWhitelistEntryByEmail(email));
}

function setWhitelistStatus(email, status) {
  const match = findWhitelistEntryByEmail(email);
  if (match) {
    match.entry.status = status;
  }
}

function removeWhitelistEntry(email) {
  const normalizedEmail = normalizeEmail(email);

  dummyWhitelist.forEach((team) => {
    team.emails = team.emails.filter((entry) => normalizeEmail(entry.email) !== normalizedEmail);
  });
}

function upsertPendingRegistration({ email, password, token, teamName = null }) {
  const normalizedEmail = normalizeEmail(email);
  const existingIndex = pendingRegistrations.findIndex((entry) => entry.email === normalizedEmail);
  const nextEntry = {
    token,
    email: normalizedEmail,
    password: String(password || ''),
    teamName: teamName || null,
    createdAt: Date.now(),
  };

  if (existingIndex >= 0) {
    pendingRegistrations[existingIndex] = nextEntry;
    return;
  }

  pendingRegistrations.push(nextEntry);
}

function consumePendingRegistration({ token, email }) {
  const normalizedEmail = normalizeEmail(email);
  const index = pendingRegistrations.findIndex(
    (entry) => entry.token === token && entry.email === normalizedEmail
  );

  if (index < 0) {
    return null;
  }

  const [pending] = pendingRegistrations.splice(index, 1);
  return pending;
}

function addConfirmedUser({ email, password, teamName = null }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    if (teamName && !existing.teamName) {
      existing.teamName = teamName;
    }
    return existing;
  }

  const createdUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password: String(password || ''),
    role: 'Student',
    isEmailConfirmed: true,
    isActive: true,
    teamName: teamName || null,
  };

  dummyUsers.push(createdUser);
  return createdUser;
}

function listDummyUsers() {
  return dummyUsers.map((entry) => ({
    id: entry.id,
    email: entry.email,
    role: entry.role || 'Student',
    status: entry.isActive === false
      ? 'Disabled'
      : (entry.isEmailConfirmed ? 'Active' : 'Pending'),
    teamName: entry.teamName || null,
  }));
}

function deactivateDummyUser(email) {
  const user = findUserByEmail(email);
  if (!user) {
    return false;
  }

  user.isActive = false;
  return true;
}

module.exports = {
  normalizeEmail,
  dummyUsers,
  dummyWhitelist,
  findUserByEmail,
  getWhitelistEntryByEmail,
  isWhitelisted,
  setWhitelistStatus,
  removeWhitelistEntry,
  upsertPendingRegistration,
  consumePendingRegistration,
  addConfirmedUser,
  listDummyUsers,
  deactivateDummyUser,
};
