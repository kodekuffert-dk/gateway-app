function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

const DUMMY_USERS = [
  {
    email: 'admin@kodekuffert.dk',
    password: 'kodekuffert123',
    name: 'Lars',
  },
  {
    email: 'student@ucn.dk',
    password: 'kodekuffert123',
    name: 'Test Student',
  },
];

function createDummyAuthProvider() {
  const sharedPassword = String(process.env.DUMMY_AUTH_PASSWORD || 'kodekuffert123');

  return {
    async loginUser({ email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const user = DUMMY_USERS.find((entry) => entry.email === normalizedEmail);

      if (user) {
        if (user.password !== String(password || '')) {
          throw new Error('Invalid credentials');
        }

        return {
          email: user.email,
          name: user.name,
        };
      }

      if (!normalizedEmail || String(password || '') !== sharedPassword) {
        throw new Error('Invalid credentials');
      }

      return { email: normalizedEmail };
    },

    async registerUser({ email, password, name }) {
      if (!email || !password || !name) {
        throw new Error('Email, password og name skal angives');
      }

      return {
        email: normalizeEmail(email),
      };
    },
  };
}

module.exports = {
  createDummyAuthProvider,
};
