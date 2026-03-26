// Normaliserer email til et sammenligneligt format.
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

// Opretter en fejl med HTTP-status, så routes kan returnere korrekt responskode.
function createAuthError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Hardcodede testbrugere til lokal udvikling uden ekstern auth-service.
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

// Returnerer en auth-provider med samme kontrakt som service-provideren
// (loginUser/registerUser), så authStore kan skifte provider transparent.
function createDummyAuthProvider() {
  return {
    // Logger kun brugere ind, der findes i DUMMY_USERS med korrekt password.
    async loginUser({ email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(password || '');

      // Begge felter er obligatoriske for login.
      if (!normalizedEmail || !normalizedPassword) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      // Dummy-login matcher kun på normaliseret email i den hardcodede liste.
      const user = DUMMY_USERS.find((entry) => entry.email === normalizedEmail);

      if (user) {
        // Samme fejlbesked for ukendt/forkert password for at undgå læk af brugerinfo.
        if (user.password !== normalizedPassword) {
          throw createAuthError(401, 'Forkert email eller password.');
        }

        // Simulerer auth-service-regel om bekræftet email.
        if (!user.isEmailConfirmed) {
          throw createAuthError(401, 'Email er ikke bekraeftet endnu.');
        }

        // Returnerer et dummy-token og brugerens rolle til sessionen.
        return {
          message: 'Login succesfuld',
          token: `dummy-jwt-token-${user.id}`,
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }

      // Ukendt bruger kan ikke logge ind i dummy-mode.
      throw createAuthError(401, 'Forkert email eller password.');
    },

    // Simulerer oprettelse uden persistence; bruges kun til at teste flow/UI.
    async registerUser({ email, password }) {
      if (!email || !password) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      // Returnerer normaliseret email for konsistens med øvrige flows.
      return {
        message: 'User created successfully. Continue by confirming email.',
        email: normalizeEmail(email),
      };
    },

    // Dummy-bekræftelse returnerer altid succes, da DUMMY_USERS allerede
    // har isEmailConfirmed sat til true og ingen reel token-validering sker.
    async confirmEmail({ token, email }) {
      if (!token || !email) {
        throw createAuthError(400, 'Token og email skal angives.');
      }
      return { message: 'Email confirmed successfully. You can now log in.' };
    },
  };
}

module.exports = {
  createDummyAuthProvider,
};
