const axios = require('axios');
const { buildSignatureHeaders } = require('../signatureHeaders');

// Læser og normaliserer base-URL til auth-servicen.
// Kaster hvis AUTH_SERVICE_URL ikke er sat, da service-provideren ikke kan fungere uden.
function getAuthServiceBaseUrl() {
  const raw = String(process.env.AUTH_SERVICE_URL || '').trim();
  if (!raw) throw new Error('AUTH_SERVICE_URL er ikke sat');
  return raw.replace(/\/+$/, '');
}

// Returnerer en whitelist-provider, der delegerer til auth-servicens whitelist-API.
// Bruger HMAC-signerede headers (X-Client-Id, X-Signature, X-Timestamp) på alle kald.
function createServiceWhitelistProvider() {
  return {
    // Henter hele whitelisten fra auth-servicen.
    async getWhitelist() {
      const baseUrl = getAuthServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/whitelist`, {
        headers: buildSignatureHeaders(null),
      });
      return Array.isArray(response.data) ? response.data : [];
    },

    // Sender et batch af emails til auth-servicen for det angivne team.
    async addWhitelistEntries({ teamName, emails }) {
      const baseUrl = getAuthServiceBaseUrl();
      const payload = { teamName, emails };
      const response = await axios.post(`${baseUrl}/whitelist`, payload, {
        headers: buildSignatureHeaders(payload),
      });
      return response.data;
    },

    // Sletter et batch af emails fra whitelisten i auth-servicen.
    async deleteWhitelistEntries({ emails }) {
      const baseUrl = getAuthServiceBaseUrl();
      const payload = { emails };
      const response = await axios.delete(`${baseUrl}/whitelist`, {
        headers: buildSignatureHeaders(payload),
        data: payload,
      });
      return response.data;
    },
  };
}

module.exports = {
  createServiceWhitelistProvider,
};
