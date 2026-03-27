const axios = require('axios');
const crypto = require('crypto');
const { normalizeCourseIds } = require('./dummyCatalogProvider');

function getCatalogServiceBaseUrl() {
  const raw = String(process.env.CATALOG_SERVICE_URL || '').trim();
  if (!raw) throw new Error('CATALOG_SERVICE_URL er ikke sat');
  return raw.replace(/\/+$/, '');
}

function buildCatalogServiceSignatureHeaders(body) {
  const clientId = String(process.env.CATALOG_SERVICE_CLIENT_ID || 'gateway-client').trim();
  const clientSecret = String(process.env.CATALOG_SERVICE_SECRET || '').trim();
  if (!clientSecret) throw new Error('CATALOG_SERVICE_SECRET er ikke sat');

  const payload = body === undefined || body === null ? '' : JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', clientSecret).update(message, 'utf8').digest('base64');

  return {
    'X-Client-Id': clientId,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  };
}

function extractServiceMessage(error, fallback) {
  return (error.response && error.response.data && error.response.data.message) || fallback;
}

function mapTeamPayload(team) {
  return {
    id: Number(team.id),
    name: team.name,
    startDate: team.startDate || null,
    endDate: team.endDate || null,
    courseIds: normalizeCourseIds(team.courseIds),
    courses: Array.isArray(team.courses) ? team.courses : [],
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null,
  };
}

function mapCoursePayload(course) {
  return {
    id: Number(course.id),
    title: course.title,
    description: course.description || '',
    createdAt: course.createdAt || null,
    updatedAt: course.updatedAt || null,
  };
}

function createServiceCatalogProvider() {
  return {
    async listTeams() {
      const baseUrl = getCatalogServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/teams`, {
        headers: buildCatalogServiceSignatureHeaders(null),
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      return rows.map(mapTeamPayload);
    },

    async findTeamByName(name) {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) return null;
      const rows = await this.listTeams();
      return rows.find((team) => team.name.toLowerCase() === normalizedName.toLowerCase()) || null;
    },

    async createTeam({ name, startDate, endDate, courseIds }) {
      const baseUrl = getCatalogServiceBaseUrl();
      const payload = {
        name: String(name || '').trim(),
        startDate: String(startDate || '').trim(),
        endDate: String(endDate || '').trim() || null,
        courseIds: normalizeCourseIds(courseIds),
      };
      const response = await axios.post(`${baseUrl}/teams`, payload, {
        headers: buildCatalogServiceSignatureHeaders(payload),
      });
      return mapTeamPayload(response.data || {});
    },

    async ensureTeamByName(name, defaults = {}) {
      const baseUrl = getCatalogServiceBaseUrl();
      const payload = {
        name: String(name || '').trim(),
        startDate: String(defaults.startDate || '').trim() || null,
        endDate: String(defaults.endDate || '').trim() || null,
      };

      if (!payload.name) {
        throw new Error('Holdnavn mangler');
      }

      const response = await axios.post(`${baseUrl}/teams/ensure`, payload, {
        headers: buildCatalogServiceSignatureHeaders(payload),
      });
      return mapTeamPayload(response.data || {});
    },

    async updateTeam({ id, name, startDate, endDate, courseIds }) {
      const baseUrl = getCatalogServiceBaseUrl();
      const payload = {
        name: String(name || '').trim(),
        startDate: String(startDate || '').trim(),
        endDate: String(endDate || '').trim() || null,
        courseIds: normalizeCourseIds(courseIds),
      };

      try {
        const response = await axios.put(`${baseUrl}/teams/${encodeURIComponent(id)}`, payload, {
          headers: buildCatalogServiceSignatureHeaders(payload),
        });
        return mapTeamPayload(response.data || {});
      } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
      }
    },

    async deleteTeam(id) {
      const baseUrl = getCatalogServiceBaseUrl();
      try {
        const response = await axios.delete(`${baseUrl}/teams/${encodeURIComponent(id)}`, {
          headers: buildCatalogServiceSignatureHeaders(null),
        });
        const data = response.data || { id: Number(id) };
        return { id: Number(data.id || id) };
      } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
      }
    },

    async listCourses() {
      const baseUrl = getCatalogServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/courses`, {
        headers: buildCatalogServiceSignatureHeaders(null),
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      return rows.map(mapCoursePayload);
    },

    async createCourse({ title, description }) {
      const baseUrl = getCatalogServiceBaseUrl();
      const payload = {
        title: String(title || '').trim(),
        description: String(description || '').trim(),
      };
      const response = await axios.post(`${baseUrl}/courses`, payload, {
        headers: buildCatalogServiceSignatureHeaders(payload),
      });
      return mapCoursePayload(response.data || {});
    },

    async updateCourse({ id, title, description }) {
      const baseUrl = getCatalogServiceBaseUrl();
      const payload = {
        title: String(title || '').trim(),
        description: String(description || '').trim(),
      };
      try {
        const response = await axios.put(`${baseUrl}/courses/${encodeURIComponent(id)}`, payload, {
          headers: buildCatalogServiceSignatureHeaders(payload),
        });
        return mapCoursePayload(response.data || {});
      } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
      }
    },

    async deleteCourse(id) {
      const baseUrl = getCatalogServiceBaseUrl();
      try {
        const response = await axios.delete(`${baseUrl}/courses/${encodeURIComponent(id)}`, {
          headers: buildCatalogServiceSignatureHeaders(null),
        });
        const data = response.data || { id: Number(id) };
        return { id: Number(data.id || id) };
      } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
      }
    },

    normalizeCourseIds,
  };
}

module.exports = {
  createServiceCatalogProvider,
};
