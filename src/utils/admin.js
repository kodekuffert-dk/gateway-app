const ADMIN_ROLES = new Set(['administrator', 'admin']);

function normalizeRoles(session) {
  if (!session || typeof session !== 'object') {
    return [];
  }

  const roles = [];

  if (typeof session.role === 'string' && session.role.trim()) {
    roles.push(session.role);
  }

  if (Array.isArray(session.roles)) {
    roles.push(...session.roles);
  }

  return roles
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean);
}

function isAdminUser(session) {
  const roles = normalizeRoles(session);
  return roles.some((role) => ADMIN_ROLES.has(role));
}

module.exports = {
  isAdminUser,
};
