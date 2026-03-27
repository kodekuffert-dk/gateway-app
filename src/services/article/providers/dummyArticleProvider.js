const crypto = require('crypto');

// Seede-data bruges som udgangspunkt for in-memory state.
// Hvert kald til createDummyArticleProvider() starter med en frisk kopi.
const SEEDED_CATEGORIES = [
  {
    id: '5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af',
    name: 'Datasikkerhed',
    createdAt: '2026-01-01T08:00:00.000Z',
    deletedAt: null,
  },
  {
    id: '3de6d6b7-fab1-460d-b40b-500dc77b8ddd',
    name: 'Case-analyse',
    createdAt: '2026-01-01T08:01:00.000Z',
    deletedAt: null,
  },
];

const SEEDED_ARTICLES = [
  {
    id: '1773387036063-ssdlc-fase-eksempler',
    title: 'SSDLC fase eksempler',
    categoryId: '5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af',
    originalFileName: 'ssdlc-fase-eksempler.md',
    markdown: `# SSDLC fase eksempler

Gennemgang af sikkerhedsaktiviteter fordelt på SSDLC-faserne.

## 1. Kravfasen

Sikkerhedskrav defineres parallelt med funktionelle krav. Eksempler:

- Adgangskontrol: kun autoriserede brugere må tilgå ressourcen
- Datavalidering: al brugerinput skal valideres server-side
- Logging: handlinger med sikkerhedsrelevans skal logges

## 2. Designfasen

Trusselmodellering (STRIDE) og arkitektur-review gennemføres her.
Designbeslutninger dokumenteres med begrundelse for valgte sikkerhedsmekanismer.

## 3. Implementeringsfasen

Statisk kodeanalyse og peer review med fokus på OWASP Top 10.

## 4. Testfasen

Penetrationstest og sikkerhedsregressionstest gennemføres.
`,
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: '1773386983610-case-cambridge-analytica-facebook',
    title: 'Case: Cambridge Analytica & Facebook',
    categoryId: '3de6d6b7-fab1-460d-b40b-500dc77b8ddd',
    originalFileName: 'case-cambridge-analytica-facebook.md',
    markdown: `# Case: Cambridge Analytica & Facebook

En analyse af datalækage og misbrug af persondata i 2018.

## Baggrund

Cambridge Analytica høstede data fra op mod 87 millioner Facebook-brugeres profiler
via en quiz-app, der udnyttede daværende API-adgang til venners data uden disses samtykke.

## Hvad gik galt

- Facebook åbnede API-adgang, der tillod tredjeparts-apps at hente vennedata
- Manglende teknisk adgangskontrol på data-kategorier
- Utilstrækkelig overvågning af, hvad data blev brugt til

## Konsekvenser

- Cambridge Analytica lukkede
- Facebook fik milliardbøde fra FTC ($5 mia.)
- Øget regulatorisk fokus på samtykke og dataminimering (GDPR)

## Læringspointer

Adgangskontrol skal håndhæves teknisk og ikke kun aftalemæssigt.
Tredjeparters brug af data skal begrænses og overvåges aktivt.
`,
    createdAt: '2026-02-01T10:05:00.000Z',
    updatedAt: '2026-02-01T10:05:00.000Z',
  },
];

function sanitizeSlug(value) {
  const cleaned = String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9\-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || 'artikel';
}

function getTitleFromMarkdown(markdown, fallback) {
  const heading = (markdown || '').split(/\r?\n/).find((line) => /^#\s+/.test(line.trim()));
  return heading ? heading.replace(/^#\s+/, '').trim() : fallback;
}

// Returnerer en article-provider med samme kontrakt som service-provideren,
// så articleStore kan skifte provider transparent via ARTICLE_PROVIDER i .env.
// Data lever udelukkende i hukommelsen og nulstilles ved genstart.
function createDummyArticleProvider() {
  const categories = SEEDED_CATEGORIES.map((c) => ({ ...c }));
  const articles = SEEDED_ARTICLES.map((a) => ({ ...a }));

  function findCategory(id) {
    return categories.find((c) => c.id === id) || null;
  }

  return {
    async listArticles() {
      return articles
        .map((a) => {
          const cat = findCategory(a.categoryId);
          return {
            id: a.id,
            title: a.title,
            categoryId: a.categoryId,
            categoryName: cat ? cat.name : null,
            originalFileName: a.originalFileName,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async getArticleById(articleId) {
      const article = articles.find((a) => a.id === articleId) || null;
      if (!article) return null;
      const cat = findCategory(article.categoryId);
      return { ...article, categoryName: cat ? cat.name : null };
    },

    async createArticleFromUpload({ originalName, markdownContent, title, categoryId }) {
      const requestedTitle = String(title || '').trim();
      const derivedTitle = getTitleFromMarkdown(
        markdownContent,
        requestedTitle || sanitizeSlug(originalName).replace(/-/g, ' ')
      );
      const slug = sanitizeSlug(requestedTitle || originalName || 'artikel');
      const id = `${Date.now()}-${slug}`;
      const now = new Date().toISOString();

      const article = {
        id,
        title: derivedTitle,
        categoryId: categoryId || null,
        originalFileName: originalName || null,
        markdown: markdownContent,
        createdAt: now,
        updatedAt: now,
      };

      articles.unshift(article);

      const cat = findCategory(categoryId);
      return {
        id,
        title: derivedTitle,
        categoryId: categoryId || null,
        categoryName: cat ? cat.name : null,
        originalFileName: originalName || null,
        createdAt: now,
        updatedAt: now,
      };
    },

    async deleteArticleById(articleId) {
      const idx = articles.findIndex((a) => a.id === articleId);
      if (idx === -1) return false;
      articles.splice(idx, 1);
      return true;
    },

    async listActiveCategories() {
      return categories.filter((c) => !c.deletedAt);
    },

    async listAllCategories() {
      return [...categories];
    },

    async createCategory(name) {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) {
        throw new Error('Kategori-navn må ikke være tomt');
      }
      const duplicate = categories.find(
        (c) => !c.deletedAt && c.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Kategorien "${normalizedName}" findes allerede`);
      }
      const category = {
        id: crypto.randomUUID(),
        name: normalizedName,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      categories.push(category);
      return category;
    },

    async softDeleteCategory(categoryId) {
      const idx = categories.findIndex((c) => c.id === categoryId && !c.deletedAt);
      if (idx === -1) return false;
      categories[idx].deletedAt = new Date().toISOString();
      return true;
    },
  };
}

module.exports = { createDummyArticleProvider };
