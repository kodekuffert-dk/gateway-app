const axios = require('axios');
const { buildSignatureHeaders } = require('../signatureHeaders');

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
      const payload = {
        email: normalizedEmail,
        password: String(password || ''),
      };

      const response = await axios.post(url, payload, {
        headers: buildSignatureHeaders(payload),
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
      const payload = {
        email: normalizedEmail,
        password: String(password || ''),
      };

      const response = await axios.post(url, payload, {
        headers: buildSignatureHeaders(payload),
      });

      return {
        email: extractEmail(response.data, normalizedEmail),
      };
    },

    // Videresender bekræftelseslinket til auth-servicens /user/confirm-email endpoint.
    // Kaldet er et simpelt GET uden signatur, da det er en offentlig brugervendt URL.
    async confirmEmail({ token, email }) {
      const config = getAuthServiceConfig();
      const url = buildAuthServiceUrl(config.baseUrl, '/user/confirm-email');
      const response = await axios.get(url, {
        params: { token, email },
      });
      return response.data;
    },

    // Auth-service OpenAPI i dette repo definerer ikke et list users-endpoint.
    // Returnerer derfor en tom liste, så admin-panelet fortsat virker på tværs
    // af providers uden at fejle.
    async listUsers() {
      return [];
    },

    async deactivateUser() {
      const error = new Error('Deaktivering af brugere er ikke understottet af nuvaerende auth-service API');
      error.statusCode = 501;
      throw error;
    },
  };
}

module.exports = {
  createServiceAuthProvider,
};
