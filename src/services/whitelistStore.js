const { createServiceWhitelistProvider } = require('./authProviders/serviceWhitelistProvider');
const { createDummyWhitelistProvider } = require('./authProviders/dummyWhitelistProvider');

function getProviderName() {
  return String(process.env.AUTH_PROVIDER || 'dummy').trim().toLowerCase();
}

function createWhitelistProvider() {
  const providerName = getProviderName();

  if (providerName === 'dummy') {
    return createDummyWhitelistProvider();
  }

  return createServiceWhitelistProvider();
}

const whitelistProvider = createWhitelistProvider();

function assertWhitelistProviderContract(provider) {
  if (
    !provider
    || typeof provider.getWhitelist !== 'function'
    || typeof provider.addWhitelistEntries !== 'function'
    || typeof provider.deleteWhitelistEntries !== 'function'
  ) {
    throw new Error('Whitelist provider mangler getWhitelist/addWhitelistEntries/deleteWhitelistEntries');
  }
}

assertWhitelistProviderContract(whitelistProvider);

async function getWhitelist() {
  return whitelistProvider.getWhitelist();
}

async function addWhitelistEntries(args) {
  return whitelistProvider.addWhitelistEntries(args);
}

async function deleteWhitelistEntries(args) {
  return whitelistProvider.deleteWhitelistEntries(args);
}

module.exports = {
  getWhitelist,
  addWhitelistEntries,
  deleteWhitelistEntries,
};
