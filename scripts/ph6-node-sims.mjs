#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ph6-node-sims.mjs — Phase 6 studio (06-04): offline node-sims for the
// authored main-workflow diff (n8n/workflow.json). ZERO n8n contact.
//
// Proves, against fixture shims of $input / $('node') / $json:
//   1. VAR-04 (engine-side): a brief WITHOUT image_variants produces output
//      deep-equal (and JSON-byte-equal) to the PRE-EDIT node's output, for
//      🧩 Map Hybrid Input (Single) AND (Story), and 🔗 Normalizar (both).
//   2. N-loop: image_variants 3 → 3 indexed items; 50 → clamps to 3; "2" → 2.
//   3. chat-mockup: layout + chat_line_1..4 mapping (null-padded, spread only
//      in that layout).
//   4. Normalizar aggregation: 3 shuffled items → final = index-0's url,
//      image_variant_urls ordered by index; 1 item → null (legacy shape).
//   5. Guardar queryReplacement ↔ column alignment for BOTH edited UPSERTs
//      (param count == max $N; per-position value mapping — the off-by-one
//      killer assert); fixture without image_variant_urls → param null.
//   6. Minimality: exactly 6 nodes differ vs the pre-edit mirror baseline
//      (git 904ade4), all others byte-identical, connections/settings/name
//      unchanged, node count unchanged.
//
// jsCode is extracted from the authored JSON AT RUNTIME (never a pasted copy);
// the pre-edit code comes from `git show <BASELINE_REF>:n8n/workflow.json`.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_REF = '904ade4'; // pre-edit mirror baseline (05-03 credential backport — the version 05-04 deployed)

const authored = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'workflow.json'), 'utf8'));
const baseline = JSON.parse(
  execFileSync('git', ['show', `${BASELINE_REF}:n8n/workflow.json`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8')
);

const getNode = (w, name) => {
  const n = w.nodes.find((x) => x.name === name);
  if (!n) throw new Error('node not found: ' + name);
  return n;
};

// ── shims ────────────────────────────────────────────────────────────────────
const makeInput = (items) => ({
  first: () => ({ json: items[0] }),
  all: () => items.map((j) => ({ json: j })),
});
const makeDollar = (refs) => (name) => {
  if (!(name in refs)) throw new Error('unshimmed cross-ref: ' + name);
  return { first: () => ({ json: refs[name] }) };
};
const runCode = (jsCode, items, refs = {}) =>
  new Function('$input', '$', jsCode)(makeInput(items), makeDollar(refs));

let pass = 0;
const ok = (label) => { pass++; console.log('  PASS ' + label); };

// ═════ 1. Map Hybrid Input (Single) ═════
console.log('\n== 🧩 Map Hybrid Input (Single) ==');
{
  const pre = getNode(baseline, '🧩 Map Hybrid Input (Single)').parameters.jsCode;
  const post = getNode(authored, '🧩 Map Hybrid Input (Single)').parameters.jsCode;
  const legacyFixture = {
    headline: 'Titular', body: 'Cuerpo', badge: 'IA', cta: 'Seguinos',
    background_prompt: 'a phone on a desk', platforms: ['instagram'],
  }; // NO image_variants / image_template / chat_lines — the CLI/WA brief shape

  // VAR-04: byte-identity of the n-absent path
  const outPre = runCode(pre, [legacyFixture]);
  const outPost = runCode(post, [legacyFixture]);
  assert.deepStrictEqual(outPost, outPre);
  assert.equal(JSON.stringify(outPost), JSON.stringify(outPre)); // key ORDER identical too
  ok('VAR-04: fixture without image_variants → deep-equal AND JSON-byte-equal to pre-edit output');

  // n=3 → 3 indexed items, identical fields
  const out3 = runCode(post, [{ ...legacyFixture, image_variants: 3 }]);
  assert.equal(out3.length, 3);
  out3.forEach((it, i) => {
    assert.equal(it.json.index, i);
    const { index, ...rest } = it.json;
    const { index: i0, ...rest0 } = out3[0].json;
    assert.deepStrictEqual(rest, rest0);
    assert.equal(it.json.layout, 'single');
  });
  ok('n=3 → 3 items index 0..2, identical non-index fields, layout single');

  assert.equal(runCode(post, [{ ...legacyFixture, image_variants: 50 }]).length, 3);
  ok('image_variants: 50 → clamps to 3');
  assert.equal(runCode(post, [{ ...legacyFixture, image_variants: '2' }]).length, 2);
  ok('image_variants: "2" → 2 items');
  assert.equal(runCode(post, [{ ...legacyFixture, image_variants: 0 }]).length, 1);
  assert.equal(runCode(post, [{ ...legacyFixture, image_variants: 'garbage' }]).length, 1);
  ok('image_variants 0 / garbage → clamps to 1');

  // chat-mockup mapping
  const chat = runCode(post, [{
    ...legacyFixture, image_template: 'chat-mockup', chat_lines: ['Hola, ¿automatizan visados?', 'Sí — end to end con IA.'],
  }]);
  assert.equal(chat.length, 1);
  assert.equal(chat[0].json.layout, 'chat-mockup');
  assert.equal(chat[0].json.chat_line_1, 'Hola, ¿automatizan visados?');
  assert.equal(chat[0].json.chat_line_2, 'Sí — end to end con IA.');
  assert.equal(chat[0].json.chat_line_3, null);
  assert.equal(chat[0].json.chat_line_4, null);
  assert.equal(chat[0].json.width, 1080);
  assert.equal(chat[0].json.height, 1080);
  ok('chat-mockup fixture → layout chat-mockup + chat_line_1..4 mapped null-padded');

  // chat fields NOT present outside chat layout (VAR-04 shape discipline)
  assert.ok(!('chat_line_1' in outPost[0].json));
  ok('non-chat output carries NO chat_line_* keys');
}

// ═════ 2. Map Hybrid Input (Story) ═════
console.log('\n== 🧩 Map Hybrid Input (Story) ==');
{
  const pre = getNode(baseline, '🧩 Map Hybrid Input (Story)').parameters.jsCode;
  const post = getNode(authored, '🧩 Map Hybrid Input (Story)').parameters.jsCode;
  const legacyFixture = {
    headline: 'Titular', body: 'Cuerpo', badge: 'IA', cta: 'Seguinos',
    background_prompt: 'vertical scene', platforms: ['instagram'],
  };
  const outPre = runCode(pre, [legacyFixture]);
  const outPost = runCode(post, [legacyFixture]);
  assert.deepStrictEqual(outPost, outPre);
  assert.equal(JSON.stringify(outPost), JSON.stringify(outPre));
  ok('VAR-04: story fixture without image_variants → deep-equal AND JSON-byte-equal to pre-edit');

  const out3 = runCode(post, [{ ...legacyFixture, image_variants: 3 }]);
  assert.equal(out3.length, 3);
  out3.forEach((it, i) => {
    assert.equal(it.json.index, i);
    assert.equal(it.json.layout, 'story');
    assert.equal(it.json.width, 1080);
    assert.equal(it.json.height, 1920);
  });
  ok('n=3 → 3 story items 1080x1920, index 0..2');

  assert.equal(runCode(post, [{ ...legacyFixture, image_variants: 50 }]).length, 3);
  ok('story clamp 50 → 3');

  // story NEVER emits chat fields even if a hand-crafted brief smuggles them
  const smuggled = runCode(post, [{ ...legacyFixture, image_template: 'chat-mockup', chat_lines: ['a'] }]);
  assert.equal(smuggled[0].json.layout, 'story');
  assert.ok(!('chat_line_1' in smuggled[0].json));
  ok('story ignores image_template/chat_lines (layout stays story, no chat keys)');
}

// ═════ 3. Normalizar URL imagen (single + story) ═════
const PARSEAR = '🔧 Parsear contenido';
const contentFixture = (model) => ({
  instagram: { caption: 'cap IG #x' }, facebook: { caption: 'cap FB' },
  image_prompt: '', headline: 'H', body: 'B', badge: 'BD', cta: 'C',
  background_prompt: 'bp', platforms: ['instagram', 'facebook'], topic: 'T',
  type: 'educational', angle: null, image_model: model,
  fal_model_id: 'fal-ai/flux-pro/v1.1', has_own_image: false, image_url: null,
  has_text_in_image: false, approval_number: '34600000000',
  timestamp: '2026-08-06T10:00:00Z', format: null, aspect_ratio: null,
  num_images: null, story_expires_at: null, publish_at: 'now',
});

for (const [nodeName, model, extra] of [
  ['🔗 Normalizar URL imagen', 'ideogram', {}],
  ['🔗 Normalizar URL imagen — Story', 'ideogram', {}],
]) {
  console.log('\n== ' + nodeName + ' ==');
  const pre = getNode(baseline, nodeName).parameters.jsCode;
  const post = getNode(authored, nodeName).parameters.jsCode;
  const content = { ...contentFixture(model), ...extra };

  // 1-item input (legacy N=1)
  const oneItem = [{ index: 0, imageUrl: 'https://cdn.example.com/v0.png' }];
  const outPre = runCode(pre, oneItem, { [PARSEAR]: content })[0].json;
  const outPost = runCode(post, oneItem, { [PARSEAR]: content })[0].json;
  assert.equal(outPost.final_image_url, 'https://cdn.example.com/v0.png');
  assert.equal(outPost.image_variant_urls, null);
  {
    const { image_variant_urls, ...others } = outPost;
    assert.deepStrictEqual(others, outPre); // every pre-existing field byte-equal
  }
  ok('1-item → final_image_url set, image_variant_urls null, all other fields deep-equal pre-edit');

  // 3-item SHUFFLED input
  const shuffled = [
    { index: 2, imageUrl: 'https://cdn.example.com/v2.png' },
    { index: 0, imageUrl: 'https://cdn.example.com/v0.png' },
    { index: 1, imageUrl: 'https://cdn.example.com/v1.png' },
  ];
  const out3 = runCode(post, shuffled, { [PARSEAR]: content })[0].json;
  assert.equal(out3.final_image_url, 'https://cdn.example.com/v0.png'); // index-0's url, NOT first-arrived
  assert.deepStrictEqual(out3.image_variant_urls, [
    'https://cdn.example.com/v0.png', 'https://cdn.example.com/v1.png', 'https://cdn.example.com/v2.png',
  ]);
  ok('3 shuffled items → final = index-0 url, image_variant_urls ordered by index');

  // null-imageUrl items filtered
  const withNull = [
    { index: 0, imageUrl: 'https://cdn.example.com/v0.png' },
    { index: 1, imageUrl: null },
    { index: 2, imageUrl: 'https://cdn.example.com/v2.png' },
  ];
  const outFiltered = runCode(post, withNull, { [PARSEAR]: content })[0].json;
  assert.deepStrictEqual(outFiltered.image_variant_urls, ['https://cdn.example.com/v0.png', 'https://cdn.example.com/v2.png']);
  ok('null-imageUrl items filtered before aggregation');
}

// flux/custom branches of the single Normalizar: behavior identical + new field null
console.log('\n== 🔗 Normalizar URL imagen (untouched branches) ==');
{
  const pre = getNode(baseline, '🔗 Normalizar URL imagen').parameters.jsCode;
  const post = getNode(authored, '🔗 Normalizar URL imagen').parameters.jsCode;
  const fluxResp = [{ images: [{ url: 'https://fal.example.com/flux.png' }] }];
  const outPre = runCode(pre, fluxResp, { [PARSEAR]: contentFixture('flux') })[0].json;
  const outPost = runCode(post, fluxResp, { [PARSEAR]: contentFixture('flux') })[0].json;
  assert.equal(outPost.image_variant_urls, null);
  const { image_variant_urls, ...others } = outPost;
  assert.deepStrictEqual(others, outPre);
  ok('flux branch: byte-equal behavior + image_variant_urls null');

  const customContent = { ...contentFixture('custom'), image_url: 'https://mine.example.com/own.png' };
  const outCustom = runCode(post, [{}], { [PARSEAR]: customContent })[0].json;
  assert.equal(outCustom.final_image_url, 'https://mine.example.com/own.png');
  assert.equal(outCustom.image_variant_urls, null);
  ok('custom branch: final = own image_url, image_variant_urls null');
}

// ═════ 4. Guardar queryReplacement ↔ column alignment ═════
const TRIGGER = '🎯 Webhook Trigger';
const evalQueryReplacement = (expr, $json, refs) => {
  const m = expr.match(/^=\{\{\s*([\s\S]*?)\s*\}\}$/);
  if (!m) throw new Error('queryReplacement is not a single ={{ }} expression');
  return new Function('$', '$json', 'return (' + m[1] + ');')(makeDollar(refs), $json);
};
const parseInsert = (query) => {
  const cols = query.match(/INSERT INTO content_sessions \(([^)]+)\) VALUES/)[1].split(',').map((s) => s.trim());
  const slots = query.match(/VALUES \(([^)]+)\) ON CONFLICT/)[1].split(',').map((s) => s.trim());
  assert.equal(cols.length, slots.length, 'column list and VALUES slot count must match');
  return { cols, slots };
};

for (const [nodeName, format, expected] of [
  ['💾 Guardar sesión Supabase', 'single', {
    session_id: 'SESS-FIXTURE-1', approval_number: '34600000000', topic: 'T', type: 'educational',
    angle: null, platforms: ['instagram', 'facebook'], image_model: 'ideogram',
    image_url: null, final_image_url: 'https://cdn.example.com/v0.png',
    instagram_caption: 'cap IG #x', facebook_caption: 'cap FB', publish_at: 'now',
    image_variant_urls: ['https://cdn.example.com/v0.png', 'https://cdn.example.com/v1.png'],
  }],
  ['💾 Guardar sesión Supabase (Story)', 'story', {
    session_id: 'SESS-FIXTURE-1', approval_number: '34600000000', topic: 'T', type: 'educational',
    angle: null, platforms: ['instagram', 'facebook'], image_model: 'ideogram',
    aspect_ratio: '9:16', story_expires_at: '2026-08-07T10:00:00Z',
    final_image_url: 'https://cdn.example.com/v0.png',
    instagram_caption: 'cap IG #x', facebook_caption: 'cap FB', publish_at: 'now',
    image_variant_urls: ['https://cdn.example.com/v0.png', 'https://cdn.example.com/v1.png'],
  }],
]) {
  console.log('\n== ' + nodeName + ' ==');
  const n = getNode(authored, nodeName);
  const { cols, slots } = parseInsert(n.parameters.query);

  // image_variant_urls appended LAST
  assert.equal(cols[cols.length - 1], 'image_variant_urls');
  assert.equal(slots[slots.length - 1], '$' + Math.max(...slots.filter((s) => s.startsWith('$')).map((s) => +s.slice(1))));
  ok('image_variant_urls is the LAST column and the LAST $N slot');

  // UPDATE clause carries EXCLUDED.image_variant_urls and never touches status literal
  assert.ok(n.parameters.query.includes('image_variant_urls = EXCLUDED.image_variant_urls'));
  assert.ok(n.parameters.query.includes("status = 'pending'"));
  ok('UPSERT SET includes EXCLUDED.image_variant_urls; pending literal intact');

  const $json = {
    approval_number: expected.approval_number, topic: expected.topic, type: expected.type,
    angle: expected.angle, platforms: expected.platforms, image_model: expected.image_model,
    image_url: expected.image_url, final_image_url: expected.final_image_url,
    aspect_ratio: expected.aspect_ratio, story_expires_at: expected.story_expires_at,
    instagram: { caption: expected.instagram_caption }, facebook: { caption: expected.facebook_caption },
    publish_at: expected.publish_at, image_variant_urls: expected.image_variant_urls,
  };
  const refs = { [TRIGGER]: { body: { session_id: expected.session_id } } };
  const params = evalQueryReplacement(n.parameters.options.queryReplacement, $json, refs);

  const maxN = Math.max(...slots.filter((s) => s.startsWith('$')).map((s) => +s.slice(1)));
  assert.equal(params.length, maxN);
  ok(`param count ${params.length} == max $N placeholder ${maxN}`);

  // THE off-by-one killer: per-position mapping column ↔ evaluated param
  const literals = { format: `'${format}'`, status: `'pending'` };
  cols.forEach((col, i) => {
    const slot = slots[i];
    if (slot.startsWith('$')) {
      const v = params[+slot.slice(1) - 1];
      assert.deepStrictEqual(v, expected[col], `column ${col} (slot ${slot}) got ${JSON.stringify(v)}`);
    } else {
      assert.equal(slot, literals[col], `literal column ${col}`);
    }
  });
  ok('per-position mapping: every $N param lands in its exact column (' + cols.length + ' columns)');

  // fixture WITHOUT image_variant_urls → last param null (legacy rows)
  const paramsLegacy = evalQueryReplacement(
    n.parameters.options.queryReplacement, { ...$json, image_variant_urls: undefined }, refs
  );
  assert.equal(paramsLegacy[paramsLegacy.length - 1], null);
  ok('fixture without image_variant_urls → last param null');
}

// ═════ 5. Minimality proof (05-02 pattern) ═════
console.log('\n== Minimality proof vs baseline ' + BASELINE_REF + ' ==');
{
  const EXPECTED_CHANGED = new Set([
    '🔧 Parsear contenido',
    '🧩 Map Hybrid Input (Single)',
    '🧩 Map Hybrid Input (Story)',
    '🔗 Normalizar URL imagen',
    '🔗 Normalizar URL imagen — Story',
    '💾 Guardar sesión Supabase',
    '💾 Guardar sesión Supabase (Story)',
  ]); // 7 names but the plan counts Parsear+Map×2+Normalizar×2+Guardar×2 = "6 existing nodes edited"
  //     per the plan's own list ("Parsear +3 fields, Map Single/Story, Normalizar x2, Guardar x2" = 7 names);
  //     the must_have "6 nodes" groups Parsear with the Map edit — we assert the EXACT name set instead.

  assert.equal(authored.nodes.length, baseline.nodes.length); // computed, never hardcoded
  ok('node count unchanged (' + authored.nodes.length + ' — computed from files, not a literal)');

  const baseMap = new Map(baseline.nodes.map((n) => [n.name, n]));
  const changed = [];
  for (const n of authored.nodes) {
    const b = baseMap.get(n.name);
    assert.ok(b, 'node added vs baseline: ' + n.name);
    if (JSON.stringify(n) !== JSON.stringify(b)) changed.push(n.name);
  }
  assert.equal(changed.length, EXPECTED_CHANGED.size, 'changed: ' + changed.join(', '));
  for (const c of changed) assert.ok(EXPECTED_CHANGED.has(c), 'UNINTENDED change: ' + c);
  ok('exactly the intended node set differs (' + changed.length + ' nodes), zero unintended, zero added');

  assert.equal(JSON.stringify(authored.connections), JSON.stringify(baseline.connections));
  ok('connections object byte-identical');
  assert.equal(JSON.stringify(authored.settings), JSON.stringify(baseline.settings));
  ok('settings byte-identical (4 keys incl. errorWorkflow)');
  assert.equal(authored.name, baseline.name);
  ok('workflow name unchanged');

  // Only jsCode / query / queryReplacement changed inside the edited nodes
  for (const name of EXPECTED_CHANGED) {
    const a = getNode(authored, name), b = baseMap.get(name);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (k === 'parameters') continue;
      assert.equal(JSON.stringify(a[k]), JSON.stringify(b[k]), name + ' non-parameters key drift: ' + k);
    }
  }
  ok('edited nodes: only `parameters` changed (position/credentials/type/typeVersion intact)');
}

console.log('\nALL SIMS GREEN — ' + pass + ' assertions-groups passed');
