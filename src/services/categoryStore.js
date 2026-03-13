const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

function getDataDirectory() {
  if (process.env.ARTICLES_DIR) {
    return path.resolve(process.env.ARTICLES_DIR);
  }
  return path.join(__dirname, '..', 'data', 'articles');
}

async function getCategoriesFilePath() {
  const dir = getDataDirectory();
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, 'categories.json');
}

async function readCategories() {
  const filePath = await getCategoriesFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeCategories(categories) {
  const filePath = await getCategoriesFilePath();
  await fs.writeFile(filePath, JSON.stringify(categories, null, 2), 'utf-8');
}

async function listActiveCategories() {
  const categories = await readCategories();
  return categories.filter((c) => !c.deletedAt);
}

async function listAllCategories() {
  return readCategories();
}

async function createCategory(name) {
  const normalizedName = (name || '').trim();
  if (!normalizedName) {
    throw new Error('Kategori-navn må ikke være tomt');
  }

  const categories = await readCategories();
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
  await writeCategories(categories);
  return category;
}

async function softDeleteCategory(categoryId) {
  const categories = await readCategories();
  const idx = categories.findIndex((c) => c.id === categoryId && !c.deletedAt);
  if (idx === -1) return false;
  categories[idx].deletedAt = new Date().toISOString();
  await writeCategories(categories);
  return true;
}

module.exports = {
  listActiveCategories,
  listAllCategories,
  createCategory,
  softDeleteCategory,
};
