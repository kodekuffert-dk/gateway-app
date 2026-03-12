const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_USERS_FILE = process.env.USERS_FILE
  || path.join(__dirname, '../../data/users.json');

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

function createFileAuthProvider(filePath) {
  function loadUsers() {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return new Map(Object.entries(JSON.parse(raw)));
    } catch {
      return new Map();
    }
  }

  function saveUsers(users) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Object.fromEntries(users), null, 2), 'utf8');
  }

  return {
    createUser(email, password) {
      const users = loadUsers();
      const normalizedEmail = normalizeEmail(email);
      const user = {
        email: normalizedEmail,
        passwordHash: hashPassword(password)
      };

      users.set(normalizedEmail, user);
      saveUsers(users);
      return user;
    },
    findUserByEmail(email) {
      const users = loadUsers();
      return users.get(normalizeEmail(email));
    }
  };
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

let authProvider = createFileAuthProvider(DEFAULT_USERS_FILE);

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
  createFileAuthProvider,
  createInMemoryAuthProvider
};
