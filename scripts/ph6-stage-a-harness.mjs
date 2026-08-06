#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ph6-stage-a-harness.mjs — Phase 6 studio (06-04 scripted / 06-05 ARMED):
// disposable Stage A harness for the N-variant + chat-mockup engine diff.
//
//   DEFAULT MODE IS DRY-RUN: builds everything, runs every construction assert
//   against the authored mirror + recorded fixtures, and performs ZERO network
//   calls to n8n (asserted via the script's own call log at exit).
//
//   ARMED MODE (06-05 ONLY, behind the Phase 5 E2E gate + 02-05 resolution):
//     PH6_GATE_CLOSED=1 node scripts/ph6-stage-a-harness.mjs --arm
//   Creates two DISPOSABLE workflows (never touching Qql7mvYRxKBsPZ5t /
//   YegOtsUONrRx7v2J), fires the 3-item matrix against marker ids TEST-PH6-*,
//   asserts via the executions API (race-proof, 05-03 rule), then tears down
//   (DELETE → GET 404 both) and archives markers via Entra admin.
//
// Estimated ARMED cost (record + re-confirm in 06-05):
//   N1 fire   — background_prompt null → Flux skipped: $0 Flux + 1 Creatomate credit
//   N3 fire   — real background_prompt: ≈ 3 × Flux ≈ $0.15 + 3 credits (sequential, ~2-5 min)
//   CHAT2 fire — background_prompt null (skip-path OFFLINE-VALIDATED in 06-04,
//               render 6b0c8bde succeeded with source:""): $0 Flux + 1 credit
//   TOTAL ≈ $0.15 Flux + 5 Creatomate credits (Essential quota, marginal ≈ 0)
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N8N_BASE = 'https://n8n-azure.propulsar.ai/api/v1';
const ARMED = process.argv.includes('--arm');
const MARKER_PREFIX = 'TEST-PH6-';
const RUN_TS = Date.now();

if (ARMED && process.env.PH6_GATE_CLOSED !== '1') {
  console.error('REFUSING TO ARM: set PH6_GATE_CLOSED=1 only after Phase 5 E2E (05-06/07/08) is closed AND 02-05 is resolved.');
  process.exit(2);
}

// ── call log: every n8n API call is recorded; dry-run must end with zero ──
const callLog = [];
async function n8nApi(method, pathname, body) {
  callLog.push({ method, pathname });
  if (!ARMED) throw new Error('DRY-RUN VIOLATION: attempted n8n call ' + method + ' ' + pathname);
  const key = process.env.N8N_API_KEY || execFileSync('az', ['keyvault', 'secret', 'show', '--vault-name', 'propulsar-prod-kv', '--name', 'n8n-api-key', '--query', 'value', '-o', 'tsv']).toString().trim();
  const res = await fetch(N8N_BASE + pathname, {
    method,
    headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 404 bodies etc. */ }
  return { status: res.status, json, text };
}

// ── mirror sources (authored 06-04 state) ──
const mirrorMain = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'workflow.json'), 'utf8'));
const mirrorSub = JSON.parse(fs.readFileSync(path.join(ROOT, 'n8n', 'subworkflow-hybrid-image.json'), 'utf8'));
const mnode = (name) => {
  const n = mirrorMain.nodes.find((x) => x.name === name);
  if (!n) throw new Error('mirror node missing: ' + name);
  return n;
};
const clone = (o) => JSON.parse(JSON.stringify(o));

let pass = 0;
const ok = (label) => { pass++; console.log('  PASS ' + label); };

// ═════ harness builders ═════

function buildHarnessSub() {
  // Byte-identical clone of the AUTHORED sub-workflow (nodes + connections).
  return {
    name: '[PH6-HARNESS] Hybrid Image clone — DISPOSABLE',
    nodes: clone(mirrorSub.nodes),
    connections: clone(mirrorSub.connections),
    settings: clone(mirrorSub.settings),
  };
}

const WEBHOOK_PATH = 'ph6-harness-content-' + RUN_TS;

function buildHarnessMain(subCloneId) {
  // Sanctioned override 1: trigger path (05-03 convention)
  const trigger = clone(mnode('🎯 Webhook Trigger'));
  delete trigger.webhookId;
  trigger.parameters.path = WEBHOOK_PATH;

  const responder = clone(mnode('✅ Responder al Wizard'));

  // SHIM (scaffolding, clearly marked): stands in for 🔧 Parsear contenido so the
  // clones' cross-refs ($('🔧 Parsear contenido')) resolve. The real Parsear needs
  // a GPT-4o response; the harness proves Map → Sub → Normalizar → Guardar.
  const parsearShim = {
    parameters: {
      jsCode: "// [PH6-HARNESS SHIM] — NOT a production clone. Emits the fire payload's\n// pre-parsed content fixture so downstream cross-refs resolve by node name.\nreturn [{ json: $('🎯 Webhook Trigger').first().json.body.content }];",
    },
    id: 'ph6-parsear-shim',
    name: '🔧 Parsear contenido',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [0, 0],
    notes: 'PH6-HARNESS SHIM — scaffolding only; the byte-identical clones are Map/Normalizar/Guardar.',
  };

  // Byte-identical clones (no-drift asserted below)
  const map = clone(mnode('🧩 Map Hybrid Input (Single)'));
  const normalizar = clone(mnode('🔗 Normalizar URL imagen'));

  // Sanctioned override 2: executeWorkflow points at the DISPOSABLE sub clone
  const hybrid = clone(mnode('🎨 Hybrid — Single'));
  hybrid.parameters.workflowId.value = subCloneId;
  hybrid.parameters.workflowId.cachedResultName = '[PH6-HARNESS] Hybrid Image clone — DISPOSABLE';

  // Sanctioned override 3 (02-03 marker convention): the Guardar clone can NEVER
  // mint a propulsar_* row — the session_id fallback becomes a TEST-PH6 marker.
  const guardar = clone(mnode('💾 Guardar sesión Supabase'));
  guardar.parameters.options.queryReplacement = guardar.parameters.options.queryReplacement.replace(
    "('propulsar_' + Date.now())",
    "('TEST-PH6-UNSET-' + Date.now())"
  );

  const nodes = [trigger, responder, parsearShim, map, hybrid, normalizar, guardar];
  // spread positions for editor sanity (cosmetic only)
  nodes.forEach((n, i) => { n.position = [i * 220, 0]; });

  return {
    name: '[PH6-HARNESS] N-variant chain — DISPOSABLE',
    nodes,
    connections: {
      '🎯 Webhook Trigger': { main: [[{ node: '✅ Responder al Wizard', type: 'main', index: 0 }, { node: '🔧 Parsear contenido', type: 'main', index: 0 }]] },
      '🔧 Parsear contenido': { main: [[{ node: '🧩 Map Hybrid Input (Single)', type: 'main', index: 0 }]] },
      '🧩 Map Hybrid Input (Single)': { main: [[{ node: '🎨 Hybrid — Single', type: 'main', index: 0 }]] },
      '🎨 Hybrid — Single': { main: [[{ node: '🔗 Normalizar URL imagen', type: 'main', index: 0 }]] },
      '🔗 Normalizar URL imagen': { main: [[{ node: '💾 Guardar sesión Supabase', type: 'main', index: 0 }]] },
      // 💾 Guardar sesión Supabase: TERMINAL — connections key deliberately absent
      // (05-03 pattern: the publish chain is unreachable by construction).
    },
    settings: { executionOrder: 'v1' },
  };
}

// ═════ fire matrix ═════

const CONTENT_BASE = {
  instagram: { caption: 'Harness PH6 — no publicar #test' },
  facebook: { caption: 'Harness PH6 — no publicar' },
  image_prompt: '', headline: 'Automatizá tu atención al cliente',
  body: 'Tu agente IA responde 24/7.', badge: 'PROPULSAR', cta: 'Escribinos',
  background_prompt: null, // Flux-skip: $0 (skip-path offline-validated 06-04)
  platforms: ['instagram'], topic: 'harness ph6', type: 'educational', angle: null,
  image_model: 'ideogram', fal_model_id: 'fal-ai/flux-pro/v1.1',
  has_own_image: false, image_url: null, has_text_in_image: false,
  approval_number: '34600000000', // dummy WA number (03-03 convention — invisible to real recovery)
  timestamp: new Date(RUN_TS).toISOString(), format: null, aspect_ratio: null,
  num_images: null, story_expires_at: null, publish_at: 'now',
};

function buildFires() {
  return [
    {
      key: 'N1',
      session_id: MARKER_PREFIX + 'N1-' + RUN_TS,
      content: { ...CONTENT_BASE }, // legacy-shaped: NO image_variants/image_template/chat_lines keys
      expect: 'DB row (Guardar RETURNING): image_variant_urls NULL, final_image_url set — VAR-04 live shape',
    },
    {
      key: 'N3',
      session_id: MARKER_PREFIX + 'N3-' + RUN_TS,
      content: { ...CONTENT_BASE, background_prompt: 'abstract glowing automation dashboard on a dark desk', image_variants: 3 },
      expect: 'cardinality 3, image_variant_urls order == index order, final_image_url == variant 0',
    },
    {
      key: 'CHAT2',
      session_id: MARKER_PREFIX + 'CHAT2-' + RUN_TS,
      content: {
        ...CONTENT_BASE, image_template: 'chat-mockup',
        chat_lines: ['¿Atienden consultas un domingo a la noche?', 'Sí — nuestro agente IA responde 24/7.'],
      },
      expect: 'render URL lands (final_image_url https png); filtered 2-bubble composition',
    },
  ];
}

// ═════ race-proof snapshot logic (05-03 rule, unit-tested in dry-run) ═════

export function maxExecId(list) {
  return list.reduce((m, e) => Math.max(m, Number(e.id)), 0);
}
export function pickOwnExecution(preMax, postList) {
  const own = postList.filter((e) => Number(e.id) > preMax);
  if (own.length === 0) return null; // registration is async — caller re-polls
  return own.reduce((a, b) => (Number(a.id) > Number(b.id) ? a : b));
}

// ═════ construction asserts (run in BOTH modes) ═════

function runConstructionAsserts() {
  console.log('\n== construction asserts (no-drift vs authored mirror) ==');
  const sub = buildHarnessSub();
  assert.equal(JSON.stringify(sub.nodes), JSON.stringify(mirrorSub.nodes));
  assert.equal(JSON.stringify(sub.connections), JSON.stringify(mirrorSub.connections));
  ok('sub clone: nodes + connections byte-identical to authored mirror (' + sub.nodes.length + ' nodes)');

  const main = buildHarnessMain('SUB-CLONE-ID-PENDING');
  const byName = (n) => main.nodes.find((x) => x.name === n);

  // byte-identical clones
  for (const name of ['🧩 Map Hybrid Input (Single)', '🔗 Normalizar URL imagen', '✅ Responder al Wizard']) {
    const c = clone(byName(name)); delete c.position;
    const m = clone(mnode(name)); delete m.position;
    assert.equal(JSON.stringify(c.parameters), JSON.stringify(m.parameters), name + ' params drift');
    assert.equal(c.type, m.type); assert.equal(c.typeVersion, m.typeVersion);
    if (m.credentials) assert.equal(JSON.stringify(c.credentials), JSON.stringify(m.credentials));
  }
  ok('Map / Normalizar / Responder clones: params byte-identical (no drift)');

  // trigger: identical except path
  {
    const c = byName('🎯 Webhook Trigger'), m = mnode('🎯 Webhook Trigger');
    const cp = clone(c.parameters), mp = clone(m.parameters);
    assert.equal(cp.path, WEBHOOK_PATH);
    cp.path = mp.path;
    assert.equal(JSON.stringify(cp), JSON.stringify(mp));
  }
  ok('trigger clone: ONLY the webhook path overridden (sanctioned)');

  // executeWorkflow: identical except workflowId target
  {
    const c = byName('🎨 Hybrid — Single'), m = mnode('🎨 Hybrid — Single');
    const cp = clone(c.parameters), mp = clone(m.parameters);
    assert.equal(cp.workflowId.value, 'SUB-CLONE-ID-PENDING');
    cp.workflowId.value = mp.workflowId.value;
    cp.workflowId.cachedResultName = mp.workflowId.cachedResultName;
    assert.equal(JSON.stringify(cp), JSON.stringify(mp));
    assert.notEqual(cp.workflowId.value, undefined);
  }
  ok('executeWorkflow clone: ONLY the target workflow id overridden (never YegOtsUONrRx7v2J live)');

  // Guardar: exactly the sanctioned marker-guard override
  {
    const c = byName('💾 Guardar sesión Supabase'), m = mnode('💾 Guardar sesión Supabase');
    assert.equal(c.parameters.query, m.parameters.query, 'query must be byte-identical');
    assert.equal(JSON.stringify(c.credentials), JSON.stringify(m.credentials));
    const restored = c.parameters.options.queryReplacement.replace("('TEST-PH6-UNSET-' + Date.now())", "('propulsar_' + Date.now())");
    assert.equal(restored, m.parameters.options.queryReplacement, 'queryReplacement diff must be EXACTLY the marker-guard fallback');
    assert.ok(c.parameters.options.queryReplacement.includes('TEST-PH6-UNSET-'));
  }
  ok('Guardar clone: queryReplacement override is EXACTLY the TEST-PH6 fallback guard (02-03 convention)');

  // graph shape: terminal Guardar, no publish chain anywhere
  assert.ok(!('💾 Guardar sesión Supabase' in main.connections), 'Guardar must be TERMINAL');
  const referenced = new Set(Object.values(main.connections).flatMap((c) => c.main.flat().map((e) => e.node)));
  for (const r of referenced) assert.ok(main.nodes.some((n) => n.name === r), 'dangling edge to ' + r);
  const forbidden = ['Re-attach', 'Prep Re-host', 'Enviar preview', 'PG Log', 'media', 'Publicar'];
  for (const n of main.nodes) for (const f of forbidden) assert.ok(!n.name.includes(f), 'forbidden node in harness: ' + n.name);
  ok('harness graph: Guardar terminal, 7 nodes, zero rehost/Meta/preview nodes (publish unreachable by construction)');

  // fire payload construction + marker naming
  const fires = buildFires();
  assert.equal(fires.length, 3);
  for (const f of fires) {
    assert.match(f.session_id, /^TEST-PH6-(N1|N3|CHAT2)-\d+$/);
    assert.equal(f.content.image_model, 'ideogram'); // Hybrid path only
    assert.equal(f.content.approval_number, '34600000000'); // dummy — invisible to WA recovery
    assert.equal(f.content.publish_at, 'now');
  }
  const [n1, n3, chat2] = fires;
  assert.ok(!('image_variants' in n1.content) && !('image_template' in n1.content) && !('chat_lines' in n1.content), 'N1 must be legacy-shaped');
  assert.equal(n1.content.background_prompt, null); // $0 fire (skip-path validated offline)
  assert.equal(n3.content.image_variants, 3);
  assert.ok(typeof n3.content.background_prompt === 'string' && n3.content.background_prompt.length > 0, 'N3 exercises real Flux');
  assert.equal(chat2.content.image_template, 'chat-mockup');
  assert.equal(chat2.content.chat_lines.length, 2);
  assert.equal(chat2.content.background_prompt, null);
  ok('fire matrix: N1 legacy-shaped / N3 variants+Flux / CHAT2 2-line chat — marker naming green');

  // snapshot logic vs recorded fixtures (incl. the 05-03 race case)
  const preFixture = [{ id: '1844350' }, { id: '1844351' }];
  assert.equal(maxExecId(preFixture), 1844351);
  assert.equal(pickOwnExecution(1844351, preFixture), null); // fire registered async → not listed yet → re-poll, NEVER read latest
  const postFixture = [{ id: '1844351' }, { id: '1844360' }, { id: '1844362' }];
  assert.equal(pickOwnExecution(1844351, postFixture).id, '1844362');
  assert.equal(pickOwnExecution(0, []), null);
  ok('race-proof snapshot logic: own-execution selection (id > pre-fire max) against recorded fixtures');

  return { sub, main, fires };
}

// ═════ armed flow (06-05 ONLY) ═════

async function armedRun() {
  const fires = buildFires();
  console.log('\n== ARMED: creating disposable workflows ==');

  const subRes = await n8nApi('POST', '/workflows', buildHarnessSub());
  assert.ok(subRes.status < 300, 'sub create failed: ' + subRes.status + ' ' + subRes.text.slice(0, 200));
  const subId = subRes.json.id;
  // no-drift assert on what n8n stored (webhookId additions on Wait nodes are the benign class)
  {
    const stored = await n8nApi('GET', '/workflows/' + subId);
    const strip = (nodes) => nodes.map((n) => { const c = { ...n }; delete c.webhookId; return c; });
    assert.equal(JSON.stringify(strip(stored.json.nodes)), JSON.stringify(strip(mirrorSub.nodes)), 'sub clone drifted on create');
  }
  console.log('  sub clone id: ' + subId);

  const mainRes = await n8nApi('POST', '/workflows', buildHarnessMain(subId));
  assert.ok(mainRes.status < 300, 'main create failed: ' + mainRes.status + ' ' + mainRes.text.slice(0, 200));
  const harnessId = mainRes.json.id;
  console.log('  harness id: ' + harnessId);

  await n8nApi('POST', '/workflows/' + subId + '/activate');
  await n8nApi('POST', '/workflows/' + harnessId + '/activate');

  const results = [];
  for (const fire of fires) {
    console.log('\n== FIRE ' + fire.key + ' (' + fire.session_id + ') ==');
    // FRESH snapshot IMMEDIATELY before the fire (Pitfall 9: ~250 execs pruned/19min)
    const pre = await n8nApi('GET', '/executions?workflowId=' + harnessId + '&limit=50');
    const preMax = maxExecId(pre.json.data || []);

    const fireRes = await fetch('https://n8n-azure.propulsar.ai/webhook/' + WEBHOOK_PATH, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ session_id: fire.session_id, content: fire.content }),
    });
    assert.equal(fireRes.status, 200, 'fire HTTP ' + fireRes.status);

    // poll for OUR execution (id > preMax), then for it to finish (N3 can take ~5 min)
    let exec = null;
    const deadline = Date.now() + 8 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const post = await n8nApi('GET', '/executions?workflowId=' + harnessId + '&limit=50');
      const own = pickOwnExecution(preMax, post.json.data || []);
      if (own && own.finished !== false && own.status !== 'running' && own.status !== 'waiting') { exec = own; break; }
    }
    assert.ok(exec, fire.key + ': own execution never finished within 8 min');
    assert.equal(exec.status, 'success', fire.key + ': execution ' + exec.id + ' status ' + exec.status);

    const detail = await n8nApi('GET', '/executions/' + exec.id + '?includeData=true');
    const runData = detail.json.data.resultData.runData;
    const nodeOut = (name) => runData[name][0].data.main[0].map((i) => i.json);

    const mapOut = nodeOut('🧩 Map Hybrid Input (Single)');
    const normOut = nodeOut('🔗 Normalizar URL imagen')[0];
    const row = nodeOut('💾 Guardar sesión Supabase')[0]; // RETURNING * — the DB row

    assert.equal(row.session_id, fire.session_id);
    if (fire.key === 'N1') {
      assert.equal(mapOut.length, 1);
      assert.equal(row.image_variant_urls, null); // VAR-04 live shape
      assert.ok(typeof row.final_image_url === 'string' && row.final_image_url.startsWith('https://'));
    } else if (fire.key === 'N3') {
      assert.equal(mapOut.length, 3);
      assert.equal(row.image_variant_urls.length, 3);
      assert.equal(row.final_image_url, row.image_variant_urls[0]);
      assert.deepStrictEqual(normOut.image_variant_urls, row.image_variant_urls);
    } else if (fire.key === 'CHAT2') {
      assert.equal(mapOut.length, 1);
      assert.equal(mapOut[0].layout, 'chat-mockup');
      assert.ok(row.final_image_url.startsWith('https://'));
      const png = await fetch(row.final_image_url);
      assert.equal(png.status, 200);
      assert.ok(png.headers.get('content-type').includes('image/png'));
    }
    console.log('  PASS ' + fire.key + ' — exec ' + exec.id + ' | ' + fire.expect);
    results.push({ fire: fire.key, execId: exec.id, session_id: fire.session_id, final_image_url: row.final_image_url, image_variant_urls: row.image_variant_urls });
  }

  // ── teardown ──
  console.log('\n== teardown ==');
  await n8nApi('POST', '/workflows/' + harnessId + '/deactivate');
  await n8nApi('POST', '/workflows/' + subId + '/deactivate');
  await n8nApi('DELETE', '/workflows/' + harnessId);
  await n8nApi('DELETE', '/workflows/' + subId);
  for (const id of [harnessId, subId]) {
    const gone = await n8nApi('GET', '/workflows/' + id);
    assert.equal(gone.status, 404, id + ' still exists after DELETE');
  }
  console.log('  both harness workflows DELETED (GET 404 verified)');
  console.log('  REMAINING (run via Entra-admin pg, 02-01 pattern): archive TEST-PH6-% markers (assert rowcount == ' + results.length + '), assert publications count unchanged vs pre-harness snapshot.');
  console.log('\nARMED RESULTS: ' + JSON.stringify(results, null, 2));
}

// ═════ main ═════

const { fires } = runConstructionAsserts();

if (!ARMED) {
  // the dry-run contract: ZERO n8n network calls, asserted via the call log
  assert.equal(callLog.length, 0, 'dry-run made n8n calls: ' + JSON.stringify(callLog));
  console.log('\n== dry-run summary ==');
  console.log('  n8n API calls made: ' + callLog.length + ' (asserted zero)');
  console.log('  fires ready: ' + fires.map((f) => f.key).join(', ') + ' (markers ' + MARKER_PREFIX + '*)');
  console.log('  webhook path (armed): ' + WEBHOOK_PATH);
  console.log('  estimated armed cost: N1 $0 + 1 credit | N3 ≈ $0.15 + 3 credits | CHAT2 $0 + 1 credit');
  console.log('\nDRY-RUN GREEN — ' + pass + ' assert groups. Arm ONLY in 06-05: PH6_GATE_CLOSED=1 node scripts/ph6-stage-a-harness.mjs --arm');
} else {
  await armedRun();
  console.log('\nARMED RUN COMPLETE — ' + pass + ' construction asserts + fire matrix green');
}
