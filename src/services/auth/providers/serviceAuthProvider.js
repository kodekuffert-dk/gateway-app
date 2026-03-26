const axios = require('axios');

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function resolvePath(value, fallback) {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function getAuthServiceConfig() {
  const baseUrlRaw = process.env.AUTH_SERVICE_URL;
  if (!baseUrlRaw || !String(baseUrlRaw).trim()) {
    throw new Error('AUTH_SERVICE_URL er ikke sat');
  }

  return {
    baseUrl: trimTrailingSlash(baseUrlRaw),
    loginPath: resolvePath(process.env.AUTH_SERVICE_LOGIN_PATH, '/login'),
    registerPath: resolvePath(process.env.AUTH_SERVICE_REGISTER_PATH, '/user'),
  };
}

function buildAuthServiceUrl(baseUrl, endpointPath) {
  if (endpointPath.startsWith('/')) {
    return `${baseUrl}${endpointPath}`;
  }
  return `${baseUrl}/${endpointPath}`;
}

function extractEmail(responseData, fallbackEmail) {
  return normalizeEmail(
    (responseData && responseData.email)
    || (responseData && responseData.user && responseData.user.email)
    || fallbackEmail
  );
}

function extractRole(responseData) {
  const role = (responseData && responseData.role)
    || (responseData && responseData.user && responseData.user.role)
    || null;

  if (!role) {
    return null;
  }

  const normalizedRole = String(role).trim();
  return normalizedRole || null;
}

function extractRoles(responseData, role) {
  const sourceRoles = (responseData && responseData.roles)
    || (responseData && responseData.user && responseData.user.roles)
    || [];

  const roles = Array.isArray(sourceRoles)
    ? sourceRoles
    : [];

  if (role) {
    roles.push(role);
  }

  return [...new Set(roles
    .map((entry) => String(entry || '').trim())
    .filter(Boolean))];
}

function createServiceAuthProvider() {
  return {
    async loginUser({ email, password }) {

      const normalizedEmail = normalizeEmail(email);
      const config = getAuthServiceConfig();
      const url = buildAuthServiceUrl(config.baseUrl, config.loginPath);

      const response = await axios.post(url, {
        email: normalizedEmail,
        password: String(password || ''),
      });

      const role = extractRole(response.data);

      return {
        email: extractEmail(response.data, normalizedEmail),
        role,
        roles: extractRoles(response.data, role),
      };
    },

    async registerUser({ email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const config = getAuthServiceConfig();
      const url = buildAuthServiceUrl(config.baseUrl, config.registerPath);

      const response = await axios.post(url, {
        email: normalizedEmail,
        password: String(password || ''),
      });

      return {
        email: extractEmail(response.data, normalizedEmail),
      };
    },
  };
}

module.exports = {
  createServiceAuthProvider,
};
