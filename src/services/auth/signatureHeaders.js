const crypto = require('crypto');

function getAuthClientConfig() {
  const clientId = String(process.env.AUTH_SERVICE_CLIENT_ID || 'gateway-client').trim();
  const clientSecret = String(process.env.AUTH_SERVICE_SECRET || '').trim();

  if (!clientSecret) {
    throw new Error('AUTH_SERVICE_SECRET er ikke sat');
  }

  return { clientId, clientSecret };
}

function resolveSignaturePayload(body) {
  if (body === undefined || body === null) {
    return '';
  }

  return JSON.stringify(body);
}

function buildTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

function buildSignatureHeaders(body) {
  const { clientId, clientSecret } = getAuthClientConfig();
  const payload = resolveSignaturePayload(body);
  const timestamp = buildTimestamp();
  const message = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', clientSecret).update(message, 'utf8').digest('base64');

  return {
    'X-Client-Id': clientId,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };
}

module.exports = {
  buildSignatureHeaders,
};