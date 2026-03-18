const { createServiceAuthProvider } = require('./auth/providers/serviceAuthProvider');
const { createDummyAuthProvider } = require('./auth/providers/dummyAuthProvider');

function getProviderName() {
  return String(process.env.AUTH_PROVIDER || 'dummy').trim().toLowerCase();
}

function createAuthProvider() {
  const providerName = getProviderName();

  if (providerName === 'dummy') {
    return createDummyAuthProvider();
  }

  return createServiceAuthProvider();
}

const authProvider = createAuthProvider();

function assertAuthProviderContract(provider) {
  if (!provider || typeof provider.loginUser !== 'function' || typeof provider.registerUser !== 'function') {
    throw new Error('Auth provider mangler loginUser/registerUser');
  }
}

assertAuthProviderContract(authProvider);

async function loginUser(credentials) {
  return authProvider.loginUser(credentials);
}

async function registerUser(payload) {
  return authProvider.registerUser(payload);
}

module.exports = {
  loginUser,
  registerUser,
  getProviderName,
};
