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
  approvals: [],     // Array of approval objects
  tasks: [],         // Array of structured action items
  comments: [],      // Array of contextual comments
  notifications: [], // Array of notifications
  userPreferences: {}, // { email: preferences }
  webhooks: [],      // Array of webhook configurations
  webhookDeliveries: [], // Array of webhook delivery logs
  aiActivityLogs: [], // Array of AI activity audit logs
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
      if (Array.isArray(data.approvals)) store.approvals = data.approvals;
      if (Array.isArray(data.tasks)) store.tasks = data.tasks;
      if (Array.isArray(data.comments)) store.comments = data.comments;
      if (Array.isArray(data.notifications)) store.notifications = data.notifications;
      if (data.userPreferences && typeof data.userPreferences === 'object') store.userPreferences = data.userPreferences;
      if (Array.isArray(data.webhooks)) store.webhooks = data.webhooks;
      if (Array.isArray(data.webhookDeliveries)) store.webhookDeliveries = data.webhookDeliveries;
      if (Array.isArray(data.aiActivityLogs)) store.aiActivityLogs = data.aiActivityLogs;
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
      approvals: store.approvals || [],
      tasks: store.tasks || [],
      comments: store.comments || [],
      notifications: (store.notifications || []).slice(0, 500),
      userPreferences: store.userPreferences || {},
      webhooks: store.webhooks || [],
      webhookDeliveries: (store.webhookDeliveries || []).slice(0, 500),
      aiActivityLogs: (store.aiActivityLogs || []).slice(0, 500),
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
