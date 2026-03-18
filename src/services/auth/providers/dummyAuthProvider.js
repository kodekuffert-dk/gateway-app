function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function createAuthError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const DUMMY_USERS = [
  {
    id: 'd36fda89-4c0f-4d8a-92b5-4d359f46b9df',
    email: 'admin@kodekuffert.dk',
    password: 'kodekuffert123',
    role: 'Administrator',
    isEmailConfirmed: true,
  },
  {
    id: '38dcf97f-d2fa-4b67-af32-25366c83d3cb',
    email: 'student@ucn.dk',
    password: 'kodekuffert123',
    role: 'Student',
    isEmailConfirmed: true,
  },
];

function createDummyAuthProvider() {
  const sharedPassword = String(process.env.DUMMY_AUTH_PASSWORD || 'kodekuffert123');

  return {
    async loginUser({ email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(password || '');

      if (!normalizedEmail || !normalizedPassword) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      const user = DUMMY_USERS.find((entry) => entry.email === normalizedEmail);

      if (user) {
        if (user.password !== normalizedPassword) {
          throw createAuthError(401, 'Forkert email eller password.');
        }

        if (!user.isEmailConfirmed) {
          throw createAuthError(401, 'Email er ikke bekraeftet endnu.');
        }

        return {
          message: 'Login succesfuld',
          token: `dummy-jwt-token-${user.id}`,
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }

      if (normalizedPassword !== sharedPassword) {
        throw createAuthError(401, 'Forkert email eller password.');
      }

      return {
        message: 'Login succesfuld',
        token: `dummy-jwt-token-${normalizedEmail}`,
        id: '00000000-0000-4000-8000-000000000000',
        email: normalizedEmail,
        role: 'Student',
      };
    },

    async registerUser({ email, password }) {
      if (!email || !password) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      return {
        message: 'User created successfully. Continue by confirming email.',
        email: normalizeEmail(email),
      };
    },
  };
}

module.exports = {
  createDummyAuthProvider,
};
