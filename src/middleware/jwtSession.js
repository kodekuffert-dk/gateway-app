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

function issueSession(res, email) {
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
  } catch (_error) {
    req.session = {};
  }

  return next();
}

module.exports = jwtSession;
module.exports.issueSession = issueSession;
module.exports.clearSession = clearSession;
