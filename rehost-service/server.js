// rehost-service — minimal upload/serve/delete HTTP microservice.
// Replaces Azure Blob as the durable, Meta-reachable re-host backend
// (Phase 12.2 — Azure Front Door was rejected by Meta's image_url fetcher,
// see .planning/phases/12.1-.../12.1-HANDOFF.md; this VPS's
// *.bacu5y.easypanel.host wildcard was proven accepted by a live smoke test).
//
// Auth split (Pitfall 6 in 12.2-RESEARCH.md): GET is fully public because
// Meta's fetcher cannot send custom headers. PUT/DELETE require X-Api-Key.
//
// Stateless file-serving API over a mounted directory — no DB, no multer
// (raw PUT binary body, mirroring the existing Azure Blob PUT-with-binary-body
// pattern already used in n8n/subworkflow-rehost-images.json).

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 8000;
const API_KEY = process.env.REHOST_API_KEY;
const BASE_DIR = process.env.REHOST_DATA_DIR || '/data/files';

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// Resolves the wildcard capture into an absolute path guaranteed to stay
// inside BASE_DIR — rejects any ../ traversal attempt (Rule 2: missing
// input validation on a write path is a real security gap, not a feature).
function resolveSafePath(wildcardParam) {
  const normalized = path.normalize(wildcardParam).replace(/^(\.\.[/\\])+/, '');
  const resolved = path.resolve(BASE_DIR, normalized);
  if (!resolved.startsWith(path.resolve(BASE_DIR) + path.sep) && resolved !== path.resolve(BASE_DIR)) {
    return null;
  }
  return resolved;
}

function requireApiKey(req, res, next) {
  const provided = req.get('X-Api-Key');
  if (!API_KEY || !provided || provided !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// PUT /files/* — authenticated upload. Raw binary body, up to 25mb.
app.put(
  '/files/*',
  requireApiKey,
  express.raw({ type: '*/*', limit: '25mb' }),
  (req, res) => {
    const wildcard = req.params[0];
    const filePath = resolveSafePath(wildcard);
    if (!filePath) {
      return res.status(400).json({ error: 'invalid path' });
    }
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, req.body);
      return res.status(200).json({ path: wildcard, bytes: req.body.length });
    } catch (err) {
      console.error('PUT /files error:', err);
      return res.status(500).json({ error: 'write failed' });
    }
  }
);

// GET /files/* — fully public, zero auth. Meta's fetcher cannot send
// custom headers, so this route must never require them.
app.get('/files/*', (req, res) => {
  const wildcard = req.params[0];
  const filePath = resolveSafePath(wildcard);
  if (!filePath) {
    return res.status(400).json({ error: 'invalid path' });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({ error: 'not found' });
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /files/* — authenticated, fail-open on already-absent files
// (mirrors ERR-01 cleanup path's delete-then-verify-gone semantics).
app.delete('/files/*', requireApiKey, (req, res) => {
  const wildcard = req.params[0];
  const filePath = resolveSafePath(wildcard);
  if (!filePath) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ deleted: true });
    }
    return res.status(200).json({ deleted: false });
  } catch (err) {
    console.error('DELETE /files error:', err);
    return res.status(500).json({ error: 'delete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`rehost-service listening on port ${PORT}, data dir ${BASE_DIR}`);
});
