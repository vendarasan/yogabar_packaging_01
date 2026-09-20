'use strict';
/**
 * apiDocsRoutes.js — Interactive OpenAPI 3.0 Documentation Viewer for Pass 8.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const openapiPath = path.join(__dirname, '../docs/openapi.json');

// Serve OpenAPI Specification JSON
router.get('/openapi.json', (req, res) => {
  if (fs.existsSync(openapiPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse OpenAPI specification' });
    }
  }
  res.status(404).json({ error: 'OpenAPI specification not found' });
});

// Serve Interactive Modern Documentation UI
router.get('/docs', (req, res) => {
  let spec = {};
  try {
    spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  } catch (err) {
    spec = { info: { title: 'Packaging Platform API', version: '1.0.0' } };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.info?.title || 'Packaging Platform API'} — API Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-bright: #f0f6fc;
      --text-muted: #8b949e;
      --primary: #2dd4bf;
      --primary-dim: rgba(45, 212, 191, 0.12);
      --get: #38bdf8;
      --post: #34d399;
      --put: #fbbf24;
      --delete: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 32px 24px;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-bright);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      background: var(--primary-dim);
      color: var(--primary);
      border: 1px solid rgba(45, 212, 191, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }
    p.desc { margin-top: 8px; color: var(--text-muted); font-size: 15px; }
    .auth-banner {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .spec-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
    }
    .spec-link:hover { text-decoration: underline; }
    .tag-section { margin-bottom: 32px; }
    .tag-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-bright);
      margin-bottom: 12px;
      padding-left: 4px;
      border-left: 3px solid var(--primary);
    }
    .endpoint {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 14px;
      cursor: pointer;
    }
    .method {
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .method.get { background: rgba(56, 189, 248, 0.15); color: var(--get); border: 1px solid rgba(56, 189, 248, 0.3); }
    .method.post { background: rgba(52, 211, 153, 0.15); color: var(--post); border: 1px solid rgba(52, 211, 153, 0.3); }
    .method.put { background: rgba(251, 191, 36, 0.15); color: var(--put); border: 1px solid rgba(251, 191, 36, 0.3); }
    .method.delete { background: rgba(248, 113, 113, 0.15); color: var(--delete); border: 1px solid rgba(248, 113, 113, 0.3); }
    .path {
      font-family: 'Fira Code', monospace;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-bright);
    }
    .summary {
      font-size: 14px;
      color: var(--text-muted);
      margin-left: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${spec.info?.title || 'Packaging Platform API'} <span class="badge">v${spec.info?.version || '1.0.0'}</span></h1>
      <p class="desc">${spec.info?.description || 'Enterprise API Documentation'}</p>
    </header>

    <div class="auth-banner">
      <div>
        <strong style="color: var(--text-bright);">Authentication:</strong>
        <span style="color: var(--text-muted); margin-left: 8px;">Supports Bearer tokens (<code style="color: var(--primary);">Authorization: Bearer &lt;token&gt;</code>) and HttpOnly session cookies.</span>
      </div>
      <a href="/api/openapi.json" target="_blank" class="spec-link">Download OpenAPI Spec (JSON) ↗</a>
    </div>

    ${Object.entries(spec.paths || {}).map(([routePath, methods]) => `
      <div class="endpoint">
        ${Object.entries(methods).map(([method, def]) => `
          <div class="endpoint-header">
            <span class="method ${method.toLowerCase()}">${method}</span>
            <span class="path">/api/v1${routePath}</span>
            <span class="summary">${def.summary || ''}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
