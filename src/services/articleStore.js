const { createDummyArticleProvider } = require('./article/providers/dummyArticleProvider');
const { createServiceArticleProvider } = require('./article/providers/serviceArticleProvider');

function getProviderName() {
  return String(process.env.ARTICLE_PROVIDER || 'dummy').trim().toLowerCase();
}

function createArticleProvider() {
  const providerName = getProviderName();

  if (providerName === 'dummy') {
    return createDummyArticleProvider();
  }

  return createServiceArticleProvider();
}

const articleProvider = createArticleProvider();

function assertArticleProviderContract(provider) {
  const required = [
    'listArticles',
    'getArticleById',
    'createArticleFromUpload',
    'deleteArticleById',
    'listActiveCategories',
    'listAllCategories',
    'createCategory',
    'softDeleteCategory',
  ];

  for (const fn of required) {
    if (typeof provider[fn] !== 'function') {
      throw new Error(`Article provider mangler ${fn}`);
    }
  }
}

assertArticleProviderContract(articleProvider);

async function listArticles() {
  return articleProvider.listArticles();
}

async function getArticleById(articleId) {
  return articleProvider.getArticleById(articleId);
}

async function createArticleFromUpload(args) {
  return articleProvider.createArticleFromUpload(args);
}

async function deleteArticleById(articleId) {
  return articleProvider.deleteArticleById(articleId);
}

async function listActiveCategories() {
  return articleProvider.listActiveCategories();
}

async function listAllCategories() {
  return articleProvider.listAllCategories();
}

async function createCategory(name) {
  return articleProvider.createCategory(name);
}

async function softDeleteCategory(categoryId) {
  return articleProvider.softDeleteCategory(categoryId);
}

module.exports = {
  listArticles,
  getArticleById,
  createArticleFromUpload,
  deleteArticleById,
  listActiveCategories,
  listAllCategories,
  createCategory,
  softDeleteCategory,
  getProviderName,
};
