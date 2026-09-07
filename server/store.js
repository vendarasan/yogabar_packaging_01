// ── In-Memory Store (cleared on server shutdown — by design) ─────
const store = {
  users: {},         // { email: { name, role, color, passwordHash, mustChangePw, tempPw } }
  sessions: {},      // { token: email }
  projects: [],      // Array of project objects
  advanceLogs: [],   // Array of log entries
  projCounter: 1,
};

module.exports = store;
