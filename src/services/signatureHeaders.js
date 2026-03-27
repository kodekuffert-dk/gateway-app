const crypto = require('crypto');

function resolveSignaturePayload(body) {
  if (body === undefined || body === null) {
    return '';
  }

  return JSON.stringify(body);
}

function buildTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

// Bygger ens service-to-service signatur-headere på tværs af auth-, article-
// og catalog-service. Hver service kan fortsat bruge sit eget client-id og secret.
function buildServiceSignatureHeaders({ clientId, clientSecret, body, missingSecretMessage }) {
  const normalizedClientId = String(clientId || 'gateway-client').trim();
  const normalizedClientSecret = String(clientSecret || '').trim();

  if (!normalizedClientSecret) {
    throw new Error(missingSecretMessage || 'Service secret er ikke sat');
  }

  const payload = resolveSignaturePayload(body);
  const timestamp = buildTimestamp();
  const message = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', normalizedClientSecret).update(message, 'utf8').digest('base64');

  return {
    'X-Client-Id': normalizedClientId,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };
}

module.exports = {
  buildServiceSignatureHeaders,
};