const fs = require('fs/promises');
const path = require('path');

function getArticlesDirectory() {
  if (process.env.ARTICLES_DIR) {
    return path.resolve(process.env.ARTICLES_DIR);
  }
  return path.join(__dirname, '..', 'data', 'articles');
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function sanitizeFileBaseName(value) {
  const cleaned = normalizeText(value)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9\-_. ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return cleaned || 'artikel';
}

function getTitleFromMarkdown(markdownContent, fallbackTitle) {
  const lines = (markdownContent || '').split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line.trim()));

  if (heading) {
    return heading.replace(/^#\s+/, '').trim();
  }

  return fallbackTitle;
}

async function ensureArticlesDirectory() {
  const articlesDirectory = getArticlesDirectory();
  await fs.mkdir(articlesDirectory, { recursive: true });
  return articlesDirectory;
}

async function getMetaFilePath() {
  const articlesDirectory = await ensureArticlesDirectory();
  return path.join(articlesDirectory, 'meta.json');
}

async function readMeta() {
  const filePath = await getMetaFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeMeta(meta) {
  const filePath = await getMetaFilePath();
  await fs.writeFile(filePath, JSON.stringify(meta, null, 2), 'utf-8');
}

async function listArticles() {
  const articlesDirectory = await ensureArticlesDirectory();
  const [files, meta] = await Promise.all([
    fs.readdir(articlesDirectory, { withFileTypes: true }),
    readMeta(),
  ]);

  const markdownFiles = files
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name);

  const articles = await Promise.all(markdownFiles.map(async (fileName) => {
    const fullPath = path.join(articlesDirectory, fileName);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const fallbackTitle = fileName.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');

    return {
      id: fileName,
      fileName,
      title: getTitleFromMarkdown(fileContent, fallbackTitle),
      categoryId: (meta[fileName] && meta[fileName].categoryId) || null,
      updatedAt: stats.mtime
    };
  }));

  return articles.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function getArticleById(articleId) {
  const normalizedId = path.basename(normalizeText(articleId));

  if (!normalizedId || !normalizedId.toLowerCase().endsWith('.md')) {
    return null;
  }

  const articlesDirectory = await ensureArticlesDirectory();
  const fullPath = path.join(articlesDirectory, normalizedId);

  try {
    const markdown = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const fallbackTitle = normalizedId.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');

    return {
      id: normalizedId,
      title: getTitleFromMarkdown(markdown, fallbackTitle),
      markdown,
      updatedAt: stats.mtime
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function createArticleFromUpload({ originalName, markdownContent, title, categoryId }) {
  const articlesDirectory = await ensureArticlesDirectory();
  const requestedTitle = normalizeText(title);
  const generatedBaseName = sanitizeFileBaseName(requestedTitle || originalName || 'artikel');
  const fileName = `${Date.now()}-${generatedBaseName}.md`;
  const destinationPath = path.join(articlesDirectory, fileName);

  await fs.writeFile(destinationPath, markdownContent, 'utf-8');

  if (categoryId) {
    const meta = await readMeta();
    meta[fileName] = { categoryId };
    await writeMeta(meta);
  }

  return {
    id: fileName,
    fileName
  };
}

async function deleteArticleById(articleId) {
  const normalizedId = path.basename(normalizeText(articleId));

  if (!normalizedId || !normalizedId.toLowerCase().endsWith('.md')) {
    return false;
  }

  const articlesDirectory = await ensureArticlesDirectory();
  const fullPath = path.join(articlesDirectory, normalizedId);

  try {
    await fs.unlink(fullPath);
    const meta = await readMeta();
    if (meta[normalizedId]) {
      delete meta[normalizedId];
      await writeMeta(meta);
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  listArticles,
  getArticleById,
  createArticleFromUpload,
  deleteArticleById
};