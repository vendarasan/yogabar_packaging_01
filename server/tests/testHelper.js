const http = require('http');
const { app, bootstrap } = require('../index');
const store = require('../store');

let serverInstance = null;
let baseUrl = '';

async function startTestServer() {
  if (!serverInstance) {
    await bootstrap();
    await new Promise((resolve) => {
      serverInstance = http.createServer(app).listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  }
  return { baseUrl, serverInstance };
}

async function stopTestServer() {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = null;
    baseUrl = '';
  }
}

async function apiRequest(method, endpoint, { body, headers = {}, token = '__superadmin__' } = {}) {
  await startTestServer();
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  const opts = {
    method,
    headers: reqHeaders
  };
  if (body !== undefined && body !== null) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${endpoint}`, opts);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return {
    status: res.status,
    headers: res.headers,
    body: data
  };
}

module.exports = {
  startTestServer,
  stopTestServer,
  apiRequest,
  store
};
