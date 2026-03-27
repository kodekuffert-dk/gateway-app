const { createDummyCatalogProvider, normalizeCourseIds } = require('./catalog/providers/dummyCatalogProvider');
const { createServiceCatalogProvider } = require('./catalog/providers/serviceCatalogProvider');

function getProviderName() {
  return String(process.env.CATALOG_PROVIDER || 'dummy').trim().toLowerCase();
}

function createCatalogProvider() {
  const providerName = getProviderName();

  if (providerName === 'dummy') {
    return createDummyCatalogProvider();
  }

  return createServiceCatalogProvider();
}

const catalogProvider = createCatalogProvider();

function assertCatalogProviderContract(provider) {
  const required = [
    'listTeams',
    'findTeamByName',
    'createTeam',
    'ensureTeamByName',
    'updateTeam',
    'deleteTeam',
    'listCourses',
    'createCourse',
    'updateCourse',
    'deleteCourse',
  ];

  for (const fn of required) {
    if (typeof provider[fn] !== 'function') {
      throw new Error(`Catalog provider mangler ${fn}`);
    }
  }
}

assertCatalogProviderContract(catalogProvider);

async function listTeams() {
  return catalogProvider.listTeams();
}

async function findTeamByName(name) {
  return catalogProvider.findTeamByName(name);
}

async function createTeam(args) {
  return catalogProvider.createTeam(args);
}

async function ensureTeamByName(name, defaults = {}) {
  return catalogProvider.ensureTeamByName(name, defaults);
}

async function updateTeam(args) {
  return catalogProvider.updateTeam(args);
}

async function deleteTeam(id) {
  return catalogProvider.deleteTeam(id);
}

async function listCourses() {
  return catalogProvider.listCourses();
}

async function createCourse(args) {
  return catalogProvider.createCourse(args);
}

async function updateCourse(args) {
  return catalogProvider.updateCourse(args);
}

async function deleteCourse(id) {
  return catalogProvider.deleteCourse(id);
}

module.exports = {
  listTeams,
  findTeamByName,
  createTeam,
  ensureTeamByName,
  updateTeam,
  deleteTeam,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  normalizeCourseIds,
  getProviderName,
};
