const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  normalizeEmail,
  dummyUsers,
  findUserByEmail,
  getWhitelistEntryByEmail,
  isWhitelisted,
  setWhitelistStatus,
  removeWhitelistEntry,
  upsertPendingRegistration,
  consumePendingRegistration,
  addConfirmedUser,
  listDummyUsers,
  deactivateDummyUser,
} = require('./dummyState');

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

// Returnerer en auth-provider med samme kontrakt som service-provideren
// (loginUser/registerUser), så authStore kan skifte provider transparent.
function createDummyAuthProvider() {
  return {
    // Logger kun brugere ind, der findes i den delte dummy-brugerliste med korrekt password.
    async loginUser({ email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(password || '');

      // Begge felter er obligatoriske for login.
      if (!normalizedEmail || !normalizedPassword) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      const user = dummyUsers.find((entry) => entry.email === normalizedEmail);

      if (user) {
        // Samme fejlbesked for ukendt/forkert password for at undgå læk af brugerinfo.
        if (user.password !== normalizedPassword) {
          throw createAuthError(401, 'Forkert email eller password.');
        }

        // Simulerer auth-service-regel om bekræftet email.
        if (!user.isEmailConfirmed) {
          throw createAuthError(401, 'Email er ikke bekraeftet endnu.');
        }

        if (user.isActive === false) {
          throw createAuthError(403, 'Brugeren er deaktiveret. Kontakt administrator.');
        }

        // Returnerer kun brugerdata; gatewayen opretter selv browser-sessionen.
        return {
          message: 'Login succesfuld',
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }

      // Ukendt bruger kan ikke logge ind i dummy-mode.
      throw createAuthError(401, 'Forkert email eller password.');
    },

    // Simulerer oprettelse med in-memory persistence i dummy-mode.
    // Skriver en bekræftelsesmail til dummy-mail/ for at simulere det link
    // auth-servicen ville sende brugeren via email.
    async registerUser({ email, password }) {
      if (!email || !password) {
        throw createAuthError(400, 'Email og password skal udfyldes.');
      }

      const normalizedEmail = normalizeEmail(email);

      if (!isWhitelisted(normalizedEmail)) {
        throw createAuthError(400, `Email (${normalizedEmail}) is not whitelisted`);
      }

      const whitelistEntry = getWhitelistEntryByEmail(normalizedEmail);
      const teamName = whitelistEntry ? whitelistEntry.teamName : null;

      if (findUserByEmail(normalizedEmail)) {
        throw createAuthError(400, 'Bruger med denne email findes allerede.');
      }

      const token = generateDummyToken();
      upsertPendingRegistration({
        email: normalizedEmail,
        password: String(password || ''),
        token,
        teamName,
      });
      setWhitelistStatus(normalizedEmail, 'Pending');
      writeDummyConfirmationEmail(normalizedEmail, token);

      // Returnerer normaliseret email for konsistens med øvrige flows.
      return {
        message: 'User created successfully. Continue by confirming email.',
        email: normalizedEmail,
      };
    },

    // Bekræfter email ved at matche token+email, oprette brugeren i memory,
    // fjerne pending-registrering og markere whitelist-entry som Active.
    async confirmEmail({ token, email }) {
      if (!token || !email) {
        throw createAuthError(400, 'Token og email skal angives.');
      }

      const normalizedEmail = normalizeEmail(email);
      const pending = consumePendingRegistration({ token: String(token), email: normalizedEmail });

      // Idempotent adfærd: hvis brugeren allerede findes, returneres succes.
      if (!pending && findUserByEmail(normalizedEmail)) {
        removeWhitelistEntry(normalizedEmail);
        return { message: 'Email already confirmed. You can now log in.' };
      }

      if (!pending) {
        throw createAuthError(400, 'Invalid or expired confirmation token.');
      }

      addConfirmedUser({
        email: normalizedEmail,
        password: pending.password,
        teamName: pending.teamName,
      });
      removeWhitelistEntry(normalizedEmail);

      return { message: 'Email confirmed successfully. You can now log in.' };
    },

    // Returnerer aktive dummy-brugere til admin-panelet.
    async listUsers() {
      return listDummyUsers();
    },

    // Deaktiverer en oprettet bruger, så login blokeres.
    async deactivateUser({ email }) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        throw createAuthError(400, 'Email skal angives.');
      }

      const wasDeactivated = deactivateDummyUser(normalizedEmail);
      if (!wasDeactivated) {
        throw createAuthError(404, 'Bruger ikke fundet.');
      }

      return { message: `Bruger ${normalizedEmail} er deaktiveret.` };
    },
  };
}

module.exports = {
  createDummyAuthProvider,
};
