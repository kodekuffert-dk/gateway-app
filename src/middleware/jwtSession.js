const jwt = require('jsonwebtoken');

const TOKEN_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'gateway_token';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  };
}

function normalizeRoles(userOrEmail) {
  if (!userOrEmail || typeof userOrEmail !== 'object' || !Array.isArray(userOrEmail.roles)) {
    return [];
  }

  return [...new Set(userOrEmail.roles
    .map((role) => String(role || '').trim())
    .filter(Boolean))];
}

function buildSessionPayload(userOrEmail) {
  if (typeof userOrEmail === 'string') {
    return {
      email: userOrEmail,
      role: null,
      roles: [],
    };
  }

  return {
    email: userOrEmail && userOrEmail.email,
    role: (userOrEmail && userOrEmail.role) || null,
    roles: normalizeRoles(userOrEmail),
  };
}

function issueSession(res, userOrEmail) {
  // Gatewayen ejer browser-sessionen og signer sin egen cookie ud fra brugerdata
  // returneret af auth-provideren.
  const payload = buildSessionPayload(userOrEmail);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
}

function clearSession(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, getCookieOptions());
}

function jwtSession(req, _res, next) {
  req.session = {};

  const token = req.cookies ? req.cookies[TOKEN_COOKIE_NAME] : null;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.session.user = payload.email;
    req.session.role = payload.role || null;
    req.session.roles = Array.isArray(payload.roles) ? payload.roles : [];
  } catch (_error) {
    req.session = {};
  }

  return next();
}

module.exports = jwtSession;
module.exports.issueSession = issueSession;
module.exports.clearSession = clearSession;
