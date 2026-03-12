const crypto = require('crypto');

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidUcnEmail(email) {
  return /@ucn\.dk$/i.test(email || '');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, storedKeyHex] = storedHash.split(':');
  const derivedKeyHex = crypto.scryptSync(password, salt, 64).toString('hex');

  const storedKey = Buffer.from(storedKeyHex, 'hex');
  const derivedKey = Buffer.from(derivedKeyHex, 'hex');

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKey, derivedKey);
}

function createInMemoryAuthProvider() {
  const users = new Map();

  return {
    createUser(email, password) {
      const normalizedEmail = normalizeEmail(email);
      const user = {
        email: normalizedEmail,
        passwordHash: hashPassword(password)
      };

      users.set(normalizedEmail, user);
      return user;
    },
    findUserByEmail(email) {
      return users.get(normalizeEmail(email));
    }
  };
}

let authProvider = createInMemoryAuthProvider();

function setAuthProvider(provider) {
  if (!provider || typeof provider.createUser !== 'function' || typeof provider.findUserByEmail !== 'function') {
    throw new Error('Invalid auth provider');
  }
  authProvider = provider;
}

function createUser(email, password) {
  return authProvider.createUser(email, password);
}

function findUserByEmail(email) {
  return authProvider.findUserByEmail(email);
}

module.exports = {
  createUser,
  findUserByEmail,
  verifyPassword,
  isValidUcnEmail,
  setAuthProvider,
  createInMemoryAuthProvider
};
