#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ph6-template-parity.mjs — Phase 6 studio (06-04): template ↔ embedded parity
// (16-05 pattern). For EVERY entry in 🧩 Prep Render's embedded TEMPLATES
// constant (n8n/subworkflow-hybrid-image.json), deep-equal its elements vs the
// source-of-truth file creatomate/templates/<layout>.json, and assert the
// DIMENSIONS entry matches the template file's width/height.
//
// The constants are extracted from the authored JSON AT RUNTIME (never pasted).
// ZERO n8n contact.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sub = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'subworkflow-hybrid-image.json'), 'utf8'));
const code = sub.nodes.find((x) => x.name === '🧩 Prep Render').parameters.jsCode;

const m = code.match(/const TEMPLATES = ([\s\S]*?);\n\nconst DIMENSIONS = ([\s\S]*?);\n\n/);
if (!m) throw new Error('TEMPLATES/DIMENSIONS extract failed');
const TEMPLATES = JSON.parse(m[1]);
const DIMENSIONS = JSON.parse(m[2]);

const layouts = Object.keys(TEMPLATES);
console.log('embedded layouts:', layouts.join(', '));
assert.deepStrictEqual(Object.keys(DIMENSIONS).sort(), layouts.slice().sort(), 'TEMPLATES and DIMENSIONS must cover the same layouts');

let green = 0;
for (const layout of layouts) {
  const file = path.join(ROOT, 'creatomate', 'templates', layout + '.json');
  const tpl = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepStrictEqual(TEMPLATES[layout], tpl.elements, layout + ': embedded elements != template file elements');
  assert.equal(JSON.stringify(TEMPLATES[layout]), JSON.stringify(tpl.elements), layout + ': byte/order drift');
  assert.deepStrictEqual(DIMENSIONS[layout], { width: tpl.width, height: tpl.height }, layout + ': DIMENSIONS mismatch');
  console.log('  PASS ' + layout + ' (' + tpl.elements.length + ' elements, ' + tpl.width + 'x' + tpl.height + ')');
  green++;
}

// chat-mockup must be present (the whole point of the 06-04 sub diff)
assert.ok(layouts.includes('chat-mockup'), 'chat-mockup missing from TEMPLATES');

console.log('\nPARITY GREEN — ' + green + '/' + layouts.length + ' templates deep-equal (incl. chat-mockup)');
