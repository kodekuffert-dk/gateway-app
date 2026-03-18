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
    loginPath: resolvePath(process.env.AUTH_SERVICE_LOGIN_PATH, '/auth/login'),
    registerPath: resolvePath(process.env.AUTH_SERVICE_REGISTER_PATH, '/auth/register'),
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

      return {
        email: extractEmail(response.data, normalizedEmail),
      };
    },

    async registerUser({ email, password, name }) {
      const normalizedEmail = normalizeEmail(email);
      const config = getAuthServiceConfig();
      const url = buildAuthServiceUrl(config.baseUrl, config.registerPath);

      const response = await axios.post(url, {
        email: normalizedEmail,
        password: String(password || ''),
        name: String(name || '').trim(),
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
