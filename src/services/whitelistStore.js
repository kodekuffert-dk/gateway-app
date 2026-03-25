const axios = require('axios');

function getAuthServiceBaseUrl() {
  const raw = String(process.env.AUTH_SERVICE_URL || '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

function getProviderName() {
  return String(process.env.AUTH_PROVIDER || 'dummy').trim().toLowerCase();
}

// In-memory dummy whitelist (for development/testing)
const dummyWhitelist = [];

function createDummyWhitelistProvider() {
  return {
    async getWhitelist() {
      return dummyWhitelist.map((team) => ({
        teamName: team.teamName,
        emails: team.emails.map((e) => ({ ...e })),
      }));
    },

    async addWhitelistEntries({ teamName, emails }) {
      let team = dummyWhitelist.find((t) => t.teamName === teamName);
      if (!team) {
        team = { teamName, emails: [] };
        dummyWhitelist.push(team);
      }
      let added = 0;
      emails.forEach((email) => {
        if (!team.emails.find((e) => e.email === email)) {
          team.emails.push({ email, status: 'Pending' });
          added += 1;
        }
      });
      return { message: `${added} emails added to whitelist for team '${teamName}'` };
    },

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

function createServiceWhitelistProvider() {
  return {
    async getWhitelist() {
      const baseUrl = getAuthServiceBaseUrl();
      if (!baseUrl) throw new Error('AUTH_SERVICE_URL er ikke sat');
      const response = await axios.get(`${baseUrl}/whitelist`);
      return Array.isArray(response.data) ? response.data : [];
    },

    async addWhitelistEntries({ teamName, emails }) {
      const baseUrl = getAuthServiceBaseUrl();
      if (!baseUrl) throw new Error('AUTH_SERVICE_URL er ikke sat');
      const response = await axios.post(`${baseUrl}/whitelist`, { teamName, emails });
      return response.data;
    },

    async deleteWhitelistEntries({ emails }) {
      const baseUrl = getAuthServiceBaseUrl();
      if (!baseUrl) throw new Error('AUTH_SERVICE_URL er ikke sat');
      const response = await axios.delete(`${baseUrl}/whitelist`, { data: { emails } });
      return response.data;
    },
  };
}

const whitelistProvider = getProviderName() === 'service'
  ? createServiceWhitelistProvider()
  : createDummyWhitelistProvider();

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
