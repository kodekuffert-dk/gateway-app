const express = require('express');
const router = express.Router();
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const authenticateStub = require('../middleware/authenticateStub');
const {
  listArticles,
  getArticleById,
  createArticleFromUpload,
  deleteArticleById
} = require('../services/articleStore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 2 },
  fileFilter: (req, file, callback) => {
    if (/\.md$/i.test(file.originalname || '')) {
      return callback(null, true);
    }
    return callback(new Error('Kun Markdown-filer (.md) er tilladt'));
  }
});

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminUser(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return getAdminEmails().includes(normalizedEmail);
}

let markedParser = null;

async function getMarkedParser() {
  if (!markedParser) {
    const markedModule = await import('marked');
    markedParser = markedModule.marked;
  }

  return markedParser;
}

async function renderMarkdownToSafeHtml(markdownContent) {
  const parser = await getMarkedParser();
  const rawHtml = parser.parse(markdownContent || '');
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
}

async function renderArticlesPage(req, res, options = {}) {
  const allArticles = await listArticles();
  const selectedId = options.selectedId || req.query.article || (allArticles[0] ? allArticles[0].id : null);
  const selectedArticle = selectedId ? await getArticleById(selectedId) : null;
  const selectedArticleHtml = selectedArticle
    ? await renderMarkdownToSafeHtml(selectedArticle.markdown)
    : '';

  res.renderWithLayout('articles', {
    title: 'Artikler',
    user: req.session.user,
    showMenu: true,
    isAdmin: isAdminUser(req.session.user),
    articles: allArticles,
    selectedArticle,
    selectedArticleHtml,
    error: options.error || null,
    success: options.success || null
  });
}

// Øvelser
router.get('/exercises', authenticateStub, (req, res) => {
  res.renderWithLayout('exercises', {
    title: 'Øvelser',
    user: req.session.user,
    showMenu: true
  });
});

// Tests
router.get('/tests', authenticateStub, (req, res) => {
  res.renderWithLayout('tests', {
    title: 'Tests',
    user: req.session.user,
    showMenu: true
  });
});

// Artikler
router.get('/articles', authenticateStub, async (req, res, next) => {
  try {
    const success = req.query.uploaded
      ? 'Artikel er uploadet'
      : (req.query.deleted ? 'Artikel er slettet' : null);
    await renderArticlesPage(req, res, { success });
  } catch (error) {
    next(error);
  }
});

router.post('/articles/upload', authenticateStub, (req, res, next) => {
  if (!isAdminUser(req.session.user)) {
    return res.status(403).send('Kun administratorer kan uploade artikler');
  }

  upload.single('articleFile')(req, res, async (uploadError) => {
    if (uploadError) {
      return renderArticlesPage(req, res, { error: uploadError.message });
    }

    try {
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return renderArticlesPage(req, res, { error: 'Vælg en Markdown-fil før upload' });
      }

      await createArticleFromUpload({
        originalName: uploadedFile.originalname,
        markdownContent: uploadedFile.buffer.toString('utf-8'),
        title: req.body.title
      });

      return res.redirect('/articles?uploaded=1');
    } catch (error) {
      return next(error);
    }
  });
});

router.post('/articles/delete', authenticateStub, async (req, res, next) => {
  if (!isAdminUser(req.session.user)) {
    return res.status(403).send('Kun administratorer kan slette artikler');
  }

  try {
    const { articleId } = req.body || {};

    if (!articleId) {
      return renderArticlesPage(req, res, { error: 'Mangler artikel-id til sletning' });
    }

    const deleted = await deleteArticleById(articleId);
    if (!deleted) {
      return renderArticlesPage(req, res, { error: 'Artiklen blev ikke fundet' });
    }

    return res.redirect('/articles?deleted=1');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
