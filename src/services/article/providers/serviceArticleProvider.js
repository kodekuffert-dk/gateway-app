const axios = require('axios');
const crypto = require('crypto');

function getArticleServiceBaseUrl() {
  const raw = String(process.env.ARTICLE_SERVICE_URL || '').trim();
  if (!raw) throw new Error('ARTICLE_SERVICE_URL er ikke sat');
  return raw.replace(/\/+$/, '');
}

// Bygger de tre service-til-service autentifikationsheadere.
// Signaturen beregnes over strengen "{timestamp}.{json-body}", som er
// samme format som gateway-appens buildSignatureHeaders til auth-service.
function buildArticleServiceSignatureHeaders(body) {
  const clientId = String(process.env.ARTICLE_SERVICE_CLIENT_ID || 'gateway-client').trim();
  const clientSecret = String(process.env.ARTICLE_SERVICE_SECRET || '').trim();
  if (!clientSecret) throw new Error('ARTICLE_SERVICE_SECRET er ikke sat');

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

// Udpakker fejlbesked fra axios-fejl hvis den findes i response body.
function extractServiceErrorMessage(error, fallback) {
  return (error.response && error.response.data && error.response.data.message) || fallback;
}

// Returnerer en article-provider, der delegerer til article-service over HTTP.
// Kontrakt er identisk med dummyArticleProvider, så articleStore kan skifte transparent.
function createServiceArticleProvider() {
  return {
    async listArticles() {
      const baseUrl = getArticleServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/articles`, {
        headers: buildArticleServiceSignatureHeaders(null),
      });
      return Array.isArray(response.data) ? response.data : [];
    },

    async getArticleById(articleId) {
      const baseUrl = getArticleServiceBaseUrl();
      try {
        const response = await axios.get(`${baseUrl}/articles/${encodeURIComponent(articleId)}`, {
          headers: buildArticleServiceSignatureHeaders(null),
        });
        return response.data || null;
      } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
      }
    },

    // Gateway uploader filen fra browseren og sender markdown-indholdet som JSON.
    // Article-service ejer ID-generering og persistering.
    async createArticleFromUpload({ originalName, markdownContent, title, categoryId }) {
      const baseUrl = getArticleServiceBaseUrl();
      const normalizedTitle = String(title || '').trim();
      const payload = {
        markdown: markdownContent,
        ...(normalizedTitle && { title: normalizedTitle }),
        ...(categoryId && { categoryId }),
        ...(originalName && { originalFileName: originalName }),
      };
      const response = await axios.post(`${baseUrl}/articles`, payload, {
        headers: buildArticleServiceSignatureHeaders(payload),
      });
      return response.data;
    },

    async deleteArticleById(articleId) {
      const baseUrl = getArticleServiceBaseUrl();
      try {
        await axios.delete(`${baseUrl}/articles/${encodeURIComponent(articleId)}`, {
          headers: buildArticleServiceSignatureHeaders(null),
        });
        return true;
      } catch (error) {
        if (error.response && error.response.status === 404) return false;
        throw error;
      }
    },

    async listActiveCategories() {
      const baseUrl = getArticleServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/categories`, {
        headers: buildArticleServiceSignatureHeaders(null),
      });
      const all = Array.isArray(response.data) ? response.data : [];
      return all.filter((c) => !c.deletedAt);
    },

    async listAllCategories() {
      const baseUrl = getArticleServiceBaseUrl();
      const response = await axios.get(`${baseUrl}/categories`, {
        params: { includeArchived: true },
        headers: buildArticleServiceSignatureHeaders(null),
      });
      return Array.isArray(response.data) ? response.data : [];
    },

    async createCategory(name) {
      const baseUrl = getArticleServiceBaseUrl();
      const normalizedName = String(name || '').trim();
      if (!normalizedName) throw new Error('Kategori-navn må ikke være tomt');
      const payload = { name: normalizedName };
      try {
        const response = await axios.post(`${baseUrl}/categories`, payload, {
          headers: buildArticleServiceSignatureHeaders(payload),
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 409) {
          throw new Error(extractServiceErrorMessage(error, `Kategorien "${normalizedName}" findes allerede`));
        }
        throw error;
      }
    },

    async softDeleteCategory(categoryId) {
      const baseUrl = getArticleServiceBaseUrl();
      try {
        await axios.delete(`${baseUrl}/categories/${encodeURIComponent(categoryId)}`, {
          headers: buildArticleServiceSignatureHeaders(null),
        });
        return true;
      } catch (error) {
        if (error.response && error.response.status === 404) return false;
        throw error;
      }
    },
  };
}

module.exports = { createServiceArticleProvider };
