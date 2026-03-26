const { dummyWhitelist, normalizeEmail } = require('./dummyState');

// Finder eller opretter en team-post i den in-memory whitelist.
function findOrCreateTeam(teamName) {
  let team = dummyWhitelist.find((t) => t.teamName === teamName);
  if (!team) {
    team = { teamName, emails: [] };
    dummyWhitelist.push(team);
  }
  return team;
}

// Returnerer en whitelist-provider med samme kontrakt som service-provideren
// (getWhitelist/addWhitelistEntries/deleteWhitelistEntries), så whitelistStore
// kan skifte provider transparent.
function createDummyWhitelistProvider() {
  return {
    // Returnerer en deep copy af den in-memory whitelist for at undgå utilsigtet mutation.
    async getWhitelist() {
      return dummyWhitelist.map((team) => ({
        teamName: team.teamName,
        emails: team.emails.map((e) => ({ ...e })),
      }));
    },

    // Tilføjer emails til det angivne team. Eksisterende emails springes over (deduplicering).
    async addWhitelistEntries({ teamName, emails }) {
      const team = findOrCreateTeam(teamName);
      let added = 0;
      emails.forEach((email) => {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
          return;
        }

        if (!team.emails.find((e) => normalizeEmail(e.email) === normalizedEmail)) {
          team.emails.push({ email: normalizedEmail, status: 'Pending' });
          added += 1;
        }
      });
      return { message: `${added} emails added to whitelist for team '${teamName}'` };
    },

    // Sletter emails på tværs af alle teams i den in-memory whitelist.
    async deleteWhitelistEntries({ emails }) {
      const emailSet = new Set(emails.map((e) => e.toLowerCase()));
      let deleted = 0;
      dummyWhitelist.forEach((team) => {
        const before = team.emails.length;
        team.emails = team.emails.filter((e) => !emailSet.has(e.email.toLowerCase()));
        deleted += before - team.emails.length;
      });
      return { message: `${deleted} emails deleted from whitelist` };
    },
  };
}

module.exports = {
  createDummyWhitelistProvider,
};
