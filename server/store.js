const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const localStorePath = path.join(dataDir, 'local_store.json');

// Initialize base store
const store = {
  users: {},         // { email: { name, role, color, passwordHash, mustChangePw, tempPw } }
  sessions: {},      // { token: email }
  projects: [],      // Array of project objects
  advanceLogs: [],   // Array of log entries
  specLibrary: [],   // Array of converted/saved Spec Library objects
  projCounter: 1,
};

// Auto-load persistent fallback from local_store.json
function loadLocalStore() {
  try {
    if (fs.existsSync(localStorePath)) {
      const content = fs.readFileSync(localStorePath, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data.specLibrary) && data.specLibrary.length > 0) {
        store.specLibrary = data.specLibrary;
        console.log(`📂 [Store] Loaded ${store.specLibrary.length} spec(s) from local_store.json`);
      }
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        store.projects = data.projects;
        console.log(`📂 [Store] Loaded ${store.projects.length} project(s) from local_store.json`);
      }
      if (Array.isArray(data.advanceLogs) && data.advanceLogs.length > 0) {
        store.advanceLogs = data.advanceLogs;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Store] Could not load local_store.json:', err.message);
  }
}

// Persist store to local_store.json
function saveLocalStore() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = {
      specLibrary: store.specLibrary || [],
      projects: store.projects || [],
      advanceLogs: (store.advanceLogs || []).slice(0, 200),
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(localStorePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ [Store] Could not save local_store.json:', err.message);
  }
}

// Initial load
loadLocalStore();

store.loadLocalStore = loadLocalStore;
store.saveLocalStore = saveLocalStore;

module.exports = store;
