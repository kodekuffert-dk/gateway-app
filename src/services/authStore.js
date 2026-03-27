const { createServiceAuthProvider } = require('./authProviders/serviceAuthProvider');
const { createDummyAuthProvider } = require('./authProviders/dummyAuthProvider');

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
  if (
    !provider
    || typeof provider.loginUser !== 'function'
    || typeof provider.registerUser !== 'function'
    || typeof provider.confirmEmail !== 'function'
    || typeof provider.listUsers !== 'function'
    || typeof provider.deactivateUser !== 'function'
  ) {
    throw new Error('Auth provider mangler loginUser/registerUser/confirmEmail/listUsers/deactivateUser');
  }
}

assertAuthProviderContract(authProvider);

async function loginUser(credentials) {
  return authProvider.loginUser(credentials);
}

async function registerUser(payload) {
  return authProvider.registerUser(payload);
}

async function confirmEmail(payload) {
  return authProvider.confirmEmail(payload);
}

async function listUsers() {
  return authProvider.listUsers();
}

async function deactivateUser(payload) {
  return authProvider.deactivateUser(payload);
}

module.exports = {
  loginUser,
  registerUser,
  confirmEmail,
  listUsers,
  deactivateUser,
  getProviderName,
};
