#!/usr/bin/env node
/**
 * eval-review-server.js — Phase 15: servidor local para la votación ciega humana.
 *
 * Sin dependencias npm (solo módulos nativos de Node). Node >= 14.
 *
 * Uso:
 *   node scripts/eval-review-server.js
 *   → abrir http://localhost:4545 en el navegador
 *
 * Endpoints:
 *   GET  /            → review.html (galería interactiva de votación)
 *   GET  /api/scores  → estado actual de human-scores.json (+ mapping si ya se reveló)
 *   POST /api/vote    → {image_id, letter, criterion, value, phase} → guarda el voto
 *                       (clave image_id|letter|criterion|phase: re-click sobrescribe,
 *                        nunca duplica)
 *   POST /api/reveal  → marca revealed_at y devuelve el mapping letra→motor
 *                       (el mapping vive SOLO en run-meta.json del lado servidor;
 *                        review.html no contiene ningún nombre de motor)
 *   POST /api/finish  → marca finished_at
 *   GET  /<archivo>   → estáticos del run dir (review.html, blind/*.png, etc.)
 *
 * Persistencia: eval-output/2026-08-02_1510/human-scores.json
 * Escritura atómica: se escribe a .tmp y se renombra encima del archivo final.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4545;
const RUN_DIR = path.resolve(__dirname, '..', 'eval-output', '2026-08-02_1510');
const SCORES_FILE = path.join(RUN_DIR, 'human-scores.json');
const TMP_FILE = SCORES_FILE + '.tmp';
const META_FILE = path.join(RUN_DIR, 'run-meta.json');

const CRITERIA = ['legibilidad', 'marca', 'layout', 'diacriticos'];
const PHASES = ['blind', 'revealed'];
const LETTERS = ['A', 'B', 'C', 'D'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function emptyState() {
  return {
    run: '2026-08-02_1510',
    criteria: CRITERIA,
    scale: '1-5',
    created_at: new Date().toISOString(),
    updated_at: null,
    revealed_at: null,
    finished_at: null,
    votes: {}
  };
}

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    if (!state.votes || typeof state.votes !== 'object') state.votes = {};
    return state;
  } catch (e) {
    return emptyState();
  }
}

function saveState(state) {
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(TMP_FILE, SCORES_FILE); // escritura atómica
}

function engineByLabel() {
  try {
    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    return (meta.blindMapping && meta.blindMapping.engineByLabel) || null;
  } catch (e) {
    return null;
  }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  let data = '';
  req.on('data', (c) => {
    data += c;
    if (data.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    try {
      cb(null, JSON.parse(data || '{}'));
    } catch (e) {
      cb(e);
    }
  });
}

const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;

  // --- API ---
  if (req.method === 'GET' && p === '/api/scores') {
    const state = loadState();
    const out = Object.assign({}, state);
    // El mapping letra→motor solo viaja al navegador DESPUÉS de revelar.
    if (state.revealed_at) out.engineByLabel = engineByLabel();
    return sendJson(res, 200, out);
  }

  if (req.method === 'POST' && p === '/api/vote') {
    return readBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { ok: false, error: 'Body JSON inválido' });
      const { image_id, letter, criterion, phase } = body;
      const value = Number(body.value);
      if (
        !image_id || typeof image_id !== 'string' || image_id.length > 200 ||
        !LETTERS.includes(letter) ||
        !CRITERIA.includes(criterion) ||
        !PHASES.includes(phase) ||
        !Number.isInteger(value) || value < 1 || value > 5
      ) {
        return sendJson(res, 400, { ok: false, error: 'Voto inválido', received: body });
      }
      const state = loadState();
      const key = image_id + '|' + letter + '|' + criterion + '|' + phase;
      state.votes[key] = {
        image_id: image_id,
        letter: letter,
        criterion: criterion,
        value: value,
        phase: phase,
        voted_at: new Date().toISOString()
      };
      saveState(state);
      return sendJson(res, 200, { ok: true, key: key });
    });
  }

  if (req.method === 'POST' && p === '/api/reveal') {
    const state = loadState();
    if (!state.revealed_at) {
      state.revealed_at = new Date().toISOString();
      saveState(state);
    }
    return sendJson(res, 200, {
      ok: true,
      revealed_at: state.revealed_at,
      engineByLabel: engineByLabel()
    });
  }

  if (req.method === 'POST' && p === '/api/finish') {
    const state = loadState();
    state.finished_at = new Date().toISOString();
    saveState(state);
    return sendJson(res, 200, { ok: true, finished_at: state.finished_at });
  }

  // --- estáticos ---
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Método no permitido' });
  }
  let rel = decodeURIComponent(p);
  if (rel === '/' || rel === '') rel = '/review.html';
  const filePath = path.normalize(path.join(RUN_DIR, rel));
  if (filePath !== RUN_DIR && !filePath.startsWith(RUN_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado: ' + rel);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Servidor de votación listo:');
  console.log('  --> http://localhost:' + PORT);
  console.log('');
  console.log('  Los votos se guardan automáticamente en:');
  console.log('  ' + SCORES_FILE);
  console.log('');
  console.log('  Dejá esta ventana abierta mientras votás. Ctrl+C para cerrar.');
});
