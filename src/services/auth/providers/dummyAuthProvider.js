const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Normaliserer email til et sammenligneligt format.
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

// Mappe til simulerede bekræftelsesemails — ligger uden for src/ så den ikke
// pakkes med i builds, og er tilføjet til .gitignore.
const DUMMY_MAIL_DIR = path.join(__dirname, '..', '..', '..', '..', 'dummy-mail');

// Genererer et simpelt token der simulerer det token auth-servicen ville sende.
function generateDummyToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Skriver en fil til DUMMY_MAIL_DIR, der simulerer den bekræftelsesmail
// auth-servicen sender til brugere ved oprettelse.
function writeDummyConfirmationEmail(email, token) {
  try {
    fs.mkdirSync(DUMMY_MAIL_DIR, { recursive: true });
    const filename = `confirm-${Date.now()}-${email.replace(/[^a-z0-9]/gi, '_')}.txt`;
    const gatewayBaseUrl = process.env.GATEWAY_BASE_URL || 'http://localhost:4000';
    const confirmUrl = `${gatewayBaseUrl}/confirm-email?token=${token}&email=${encodeURIComponent(email)}`;
    const content = [
      'From:    noreply@kodekuffert.dk',
      `To:      ${email}`,
      'Subject: Bekræft din email – Kodekuffert.dk',
      '',
      'Hej,',
      '',
      'Tak for din oprettelse på Kodekuffert.dk.',
      '',
      'Klik på linket herunder for at bekræfte din email-adresse:',
      '',
      `  ${confirmUrl}`,
      '',
      'Linket udløber ikke i dummy-tilstand.',
      '',
      'Mvh.',
      'Kodekuffert.dk',
      '',
      '---',
      '(Dette er en simuleret email genereret af dummy auth-provider)',
    ].join('\n');

    fs.writeFileSync(path.join(DUMMY_MAIL_DIR, filename), content, 'utf-8');
  } catch (err) {
    // Fejl i email-simulering må ikke afbryde registreringsflowet
    console.warn('[dummy-mail] Kunne ikke skrive bekræftelsesmail:', err.message);
  }
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
    // Skriver en bekræftelsesmail til dummy-mail/ for at simulere det link
    // auth-servicen ville sende brugeren via email.
    async registerUser({ email, password }) {
      if (!email || !password) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      const normalizedEmail = normalizeEmail(email);
      const token = generateDummyToken();
      writeDummyConfirmationEmail(normalizedEmail, token);

      // Returnerer normaliseret email for konsistens med øvrige flows.
      return {
        message: 'User created successfully. Continue by confirming email.',
        email: normalizedEmail,
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
