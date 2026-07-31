// Phase 12.2-03 — E2E verification of the Hostinger re-host seam.
//
// Reuses patterns from fire-exec.mjs (12.1) and smoke-test.mjs (12.2-01):
// reads secrets from env vars / repo .env, never hardcodes them.
//
// Why a harness workflow (Task 1): n8n's public REST API has no endpoint to
// directly execute an arbitrary workflow (POST /workflows/{id}/run returns
// 405 — confirmed live against this instance before writing this script).
// The real sub-workflow (BIaG266Q6AZpv4Sq) can only be entered via an
// Execute-Workflow-Trigger node, which only another workflow's "Execute
// Workflow" node can call. Firing a full brief through the real production
// webhook was rejected as the test path here because the re-host step runs
// AFTER WhatsApp SI approval in this pipeline (confirmed via a live GET of
// the main workflow's "Prep Re-host Input" node) — approving would chain
// directly into the 5 Meta-facing container-creation/publish nodes with no
// safe stopping point, which this plan's Task 1 explicitly forbids ("do NOT
// let it continue into any Meta-facing node").
//
// Instead, this script provisions a small, disposable harness workflow
// (Webhook -> flatten body -> Execute Workflow -> BIaG266Q6AZpv4Sq) that
// calls the REAL, already-deployed sub-workflow in isolation and returns its
// output directly in the HTTP response (responseMode: lastNode). The
// harness is deleted at the end (see `cleanup`). This exercises the exact
// same sub-workflow object production uses — nothing about the sub-workflow
// itself is faked or mocked.
//
// Usage:
//   REHOST_API_KEY=<key> N8N_DEPLOY_KEY=<key> node verify-rehost.mjs <command>
//
// Commands:
//   setup              - create + activate the harness workflow
//   seed-source-image  - PUT a small test PNG to rehost-service, print its public URL (source_url for Execution A/B)
//   exec-a              - fire Execution A (success path) through the harness, print evidence
//   patch-bad-key       - deploy the sub-workflow with a deliberately-wrong X-Api-Key (backs up current version first)
//   exec-b              - fire Execution B (injected-failure path) through the harness, print evidence
//   restore-subworkflow - redeploy the original (git-committed) sub-workflow, undoing patch-bad-key
//   meta-tests <url>    - run all 5 Meta Graph API container-creation tests against <url>
//   cleanup             - delete the harness workflow + delete all test files uploaded to rehost-service during this run
//   status              - print current harness workflow id/state if a run file exists

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

const REPO_ROOT = path.resolve(process.cwd());
const RUN_FILE = path.resolve(REPO_ROOT, '.planning/phases/12.2-hostinger-vps-re-host-layer/verify-rehost-run.json');
const SUBWORKFLOW_FILE = path.resolve(REPO_ROOT, 'n8n/subworkflow-rehost-images.json');

const N8N_BASE = 'https://n8n-azure.propulsar.ai';
const SUB_WORKFLOW_ID = 'BIaG266Q6AZpv4Sq';
const REHOST_BASE_HOST = 'rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host';

const N8N_API_KEY = process.env.N8N_DEPLOY_KEY;
const REHOST_API_KEY = process.env.REHOST_API_KEY;

function loadEnv() {
  const text = fs.readFileSync(path.resolve(REPO_ROOT, '.env'), 'utf-8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function loadRun() {
  if (!fs.existsSync(RUN_FILE)) return { uploaded_files: [] };
  return JSON.parse(fs.readFileSync(RUN_FILE, 'utf-8'));
}
function saveRun(run) {
  fs.writeFileSync(RUN_FILE, JSON.stringify(run, null, 2));
}

function request(opts, body = null) {
  const lib = opts.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function n8nApi(method, urlPath, jsonBody) {
  if (!N8N_API_KEY) throw new Error('N8N_DEPLOY_KEY env var not set');
  const body = jsonBody ? Buffer.from(JSON.stringify(jsonBody), 'utf8') : null;
  const u = new URL(N8N_BASE + urlPath);
  const res = await request({
    method,
    protocol: 'https:',
    hostname: u.hostname,
    path: u.pathname + u.search,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': body.length } : {}),
    },
  }, body);
  let parsed = null;
  try { parsed = JSON.parse(res.body.toString('utf-8')); } catch { parsed = res.body.toString('utf-8'); }
  return { status: res.statusCode, body: parsed };
}

function genValidPng(label) {
  const W = 1080, H = 1080;
  function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b; }
  function crc32(buf) {
    let c, table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    let crc = 0xFFFFFFFF;
    for (const b of buf) crc = (table[(crc ^ b) & 0xFF] ^ (crc >>> 8)) >>> 0;
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const len = u32(data.length);
    const typ = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typ, data])) >>> 0, 0);
    return Buffer.concat([len, typ, data, crc]);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.concat([u32(W), u32(H), Buffer.from([8, 2, 0, 0, 0])]);
  // vary color slightly per label so distinct test files are visibly distinct in raw bytes
  const seed = (label || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const R = 24 + (seed % 50), G = 133, B = 224;
  const row = Buffer.alloc(1 + W * 3);
  row[0] = 0;
  for (let x = 0; x < W; x++) { row[1 + x * 3] = R; row[1 + x * 3 + 1] = G; row[1 + x * 3 + 2] = B; }
  const raw = Buffer.alloc(H * row.length);
  for (let y = 0; y < H; y++) row.copy(raw, y * row.length);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

async function rehostPut(filePath, buf) {
  if (!REHOST_API_KEY) throw new Error('REHOST_API_KEY env var not set');
  return request({
    method: 'PUT', protocol: 'https:', hostname: REHOST_BASE_HOST, path: filePath,
    headers: { 'X-Api-Key': REHOST_API_KEY, 'Content-Type': 'image/png', 'Content-Length': buf.length },
  }, buf);
}
async function rehostGet(filePath) {
  return request({ method: 'GET', protocol: 'https:', hostname: REHOST_BASE_HOST, path: filePath });
}
async function rehostDelete(filePath) {
  if (!REHOST_API_KEY) throw new Error('REHOST_API_KEY env var not set');
  return request({
    method: 'DELETE', protocol: 'https:', hostname: REHOST_BASE_HOST, path: filePath,
    headers: { 'X-Api-Key': REHOST_API_KEY },
  });
}

function harnessDefinition(webhookPath) {
  return {
    name: 'ZZ-TEMP-verify-12-2-03-harness (delete after use)',
    nodes: [
      {
        parameters: { httpMethod: 'POST', path: webhookPath, responseMode: 'lastNode', options: {} },
        id: 'harness-webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [240, 300],
      },
      {
        parameters: { jsCode: 'return [{ json: $json.body }];', mode: 'runOnceForAllItems' },
        id: 'harness-flatten',
        name: 'Flatten Body',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [460, 300],
      },
      {
        parameters: {
          source: 'database',
          workflowId: { __rl: true, mode: 'list', value: SUB_WORKFLOW_ID, cachedResultName: 'Re-host Images to Azure Blob' },
          workflowInputs: { mappingMode: 'passthrough' },
          options: { waitForSubWorkflow: true },
        },
        id: 'harness-execute-subworkflow',
        name: 'Execute Re-host Sub-workflow',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [680, 300],
      },
    ],
    connections: {
      Webhook: { main: [[{ node: 'Flatten Body', type: 'main', index: 0 }]] },
      'Flatten Body': { main: [[{ node: 'Execute Re-host Sub-workflow', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

async function cmdSetup() {
  const webhookPath = `verify-12-2-03-${Date.now()}`;
  const created = await n8nApi('POST', '/api/v1/workflows', harnessDefinition(webhookPath));
  if (created.status !== 200 && created.status !== 201) {
    console.error('FATAL: harness create failed', created.status, JSON.stringify(created.body));
    process.exit(1);
  }
  const harnessId = created.body.id;
  console.log('harness workflow created:', harnessId);
  const act = await n8nApi('POST', `/api/v1/workflows/${harnessId}/activate`, {});
  console.log('activate status:', act.status, 'active:', act.body.active);
  const run = loadRun();
  run.harness_id = harnessId;
  run.webhook_path = webhookPath;
  run.webhook_url = `${N8N_BASE}/webhook/${webhookPath}`;
  saveRun(run);
  console.log('webhook url:', run.webhook_url);
}

async function cmdSeedSourceImage() {
  const run = loadRun();
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const filePath = `/files/2026-verify/12-2-03/source-${stamp}.png`;
  const png = genValidPng('source-' + stamp);
  const put = await rehostPut(filePath, png);
  console.log('seed PUT status:', put.statusCode, put.body.toString('utf-8'));
  const publicUrl = `https://${REHOST_BASE_HOST}${filePath}`;
  run.uploaded_files = run.uploaded_files || [];
  run.uploaded_files.push(filePath);
  run.source_image_url = publicUrl;
  saveRun(run);
  console.log('source_image_url:', publicUrl);
}

async function fireHarness(run, tag) {
  const nowIso = new Date().toISOString();
  const brief = {
    image_urls: [{ index: 1, url: run.source_image_url }],
    post_id: `verify-12-2-${tag}-${Date.now()}`,
    approval_number: (loadEnv().WHATSAPP_APPROVAL_NUMBER || '').replace(/^\+/, '').replace(/\s/g, ''),
  };
  const u = new URL(run.webhook_url);
  const body = Buffer.from(JSON.stringify(brief), 'utf8');
  console.log(`\n=== Firing harness (${tag}) ===`);
  console.log('brief:', JSON.stringify(brief));
  const started = Date.now();
  const res = await request({
    method: 'POST', protocol: 'https:', hostname: u.hostname, path: u.pathname,
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
  }, body);
  const durationMs = Date.now() - started;
  let parsedBody = null;
  try { parsedBody = JSON.parse(res.body.toString('utf-8')); } catch { parsedBody = res.body.toString('utf-8'); }
  console.log('status:', res.statusCode, 'duration_ms:', durationMs);
  console.log('body:', JSON.stringify(parsedBody).substring(0, 2000));
  return { status: res.statusCode, body: parsedBody, durationMs, brief };
}

async function findLatestExecution(workflowId) {
  const res = await n8nApi('GET', `/api/v1/executions?workflowId=${workflowId}&limit=1&includeData=true`);
  if (res.status !== 200 || !res.body.data || res.body.data.length === 0) return null;
  return res.body.data[0];
}

async function cmdExecA() {
  const run = loadRun();
  if (!run.webhook_url) throw new Error('run setup first');
  if (!run.source_image_url) throw new Error('run seed-source-image first');
  const result = await fireHarness(run, 'exec-a');
  // Also fetch the real sub-workflow execution record for node-level detail
  const exec = await findLatestExecution(SUB_WORKFLOW_ID);
  run.exec_a = {
    harness_response_status: result.status,
    harness_response_body: result.body,
    brief: result.brief,
    subworkflow_execution_id: exec ? exec.id : null,
    subworkflow_execution_status: exec ? exec.status : null,
    subworkflow_execution_finished: exec ? exec.finished : null,
  };
  saveRun(run);
  console.log('\nsub-workflow execution id:', exec ? exec.id : 'NOT FOUND', 'status:', exec ? exec.status : null);
  if (result.body && result.body.blob_urls) {
    run.exec_a_blob_url = result.body.blob_urls[0]?.url;
    saveRun(run);
    console.log('exec-a blob_urls[0].url:', run.exec_a_blob_url);
    // independent zero-auth GET, exactly as Meta's fetcher would do
    const check = await rehostGet(new URL(run.exec_a_blob_url).pathname);
    console.log('independent GET (no auth) status:', check.statusCode, 'size:', check.body.length);
    run.exec_a_independent_get = { status: check.statusCode, size: check.body.length };
    saveRun(run);
    // track for cleanup
    run.uploaded_files = run.uploaded_files || [];
    run.uploaded_files.push(new URL(run.exec_a_blob_url).pathname);
    saveRun(run);
  }
}

async function cmdPatchBadKey() {
  const remote = await n8nApi('GET', `/api/v1/workflows/${SUB_WORKFLOW_ID}`);
  if (remote.status !== 200) throw new Error('failed to fetch sub-workflow: ' + JSON.stringify(remote.body));
  const run = loadRun();
  run.pre_patch_versionId = remote.body.versionId;
  const backupPath = path.resolve(REPO_ROOT, '.planning/phases/12.2-hostinger-vps-re-host-layer/subworkflow-pre-patch-backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(remote.body, null, 2));
  console.log('backed up current remote sub-workflow versionId', remote.body.versionId, '->', backupPath);

  const patched = JSON.parse(JSON.stringify(remote.body));
  const putNode = patched.nodes.find(n => n.id === 'http-put-blob');
  if (!putNode) throw new Error('http-put-blob node not found in remote sub-workflow');
  const header = putNode.parameters.headerParameters.parameters.find(p => p.name === 'X-Api-Key');
  header.value = 'BROKEN-KEY-INJECTED-BY-12-2-03-TEST';
  console.log('patched X-Api-Key header to a deliberately-wrong value');

  const payload = {
    name: patched.name, nodes: patched.nodes, connections: patched.connections, settings: patched.settings,
  };
  const put = await n8nApi('PUT', `/api/v1/workflows/${SUB_WORKFLOW_ID}`, payload);
  console.log('patch deploy status:', put.status, 'new versionId:', put.body.versionId);
  run.patched_versionId = put.body.versionId;
  saveRun(run);
}

async function cmdExecB() {
  const run = loadRun();
  if (!run.patched_versionId) throw new Error('run patch-bad-key first');
  const result = await fireHarness(run, 'exec-b');
  const exec = await findLatestExecution(SUB_WORKFLOW_ID);
  run.exec_b = {
    harness_response_status: result.status,
    harness_response_body: result.body,
    brief: result.brief,
    subworkflow_execution_id: exec ? exec.id : null,
    subworkflow_execution_status: exec ? exec.status : null,
  };
  saveRun(run);
  console.log('\nsub-workflow execution id:', exec ? exec.id : 'NOT FOUND', 'status:', exec ? exec.status : null);
  if (exec && exec.data) {
    const runData = exec.data.resultData?.runData || {};
    console.log('nodes executed:', Object.keys(runData));
    run.exec_b_run_data_nodes = Object.keys(runData);
    // dump PUT node's error/output + confirm downstream nodes fired
    for (const nodeName of ['📤 HTTP PUT — Upload to Hostinger', '📱 Notify Abort WA', '🛑 Stop And Error']) {
      if (runData[nodeName]) {
        const entry = runData[nodeName][0];
        console.log(`--- ${nodeName} ---`);
        console.log(JSON.stringify(entry?.error || entry?.data || {}).substring(0, 800));
      } else {
        console.log(`--- ${nodeName} --- NOT IN runData`);
      }
    }
    saveRun(run);
  }
}

async function cmdRestoreSubworkflow() {
  const backupPath = path.resolve(REPO_ROOT, '.planning/phases/12.2-hostinger-vps-re-host-layer/subworkflow-pre-patch-backup.json');
  const local = JSON.parse(fs.readFileSync(SUBWORKFLOW_FILE, 'utf-8'));
  // Deploy the git-committed, correct version (source of truth), not just the pre-patch backup,
  // to guarantee we land on the exact reviewed/committed state.
  const payload = { name: local.name, nodes: local.nodes, connections: local.connections, settings: local.settings };
  const put = await n8nApi('PUT', `/api/v1/workflows/${SUB_WORKFLOW_ID}`, payload);
  console.log('restore deploy status:', put.status, 'new versionId:', put.body.versionId);
  const putNode = put.body.nodes.find(n => n.id === 'http-put-blob');
  const header = putNode.parameters.headerParameters.parameters.find(p => p.name === 'X-Api-Key');
  console.log('restored X-Api-Key expression:', header.value);
  const run = loadRun();
  run.restored_versionId = put.body.versionId;
  run.restore_confirmed_expression = header.value;
  saveRun(run);
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); // scratch file, not meant to be committed
}

async function metaCreateContainer(igAccountId, token, params) {
  const form = new URLSearchParams({ ...params, access_token: token }).toString();
  return request({
    method: 'POST', protocol: 'https:', hostname: 'graph.facebook.com', path: `/v22.0/${igAccountId}/media`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) },
  }, form);
}
async function metaFbPhoto(fbPageId, token, params) {
  const form = new URLSearchParams({ ...params, access_token: token }).toString();
  return request({
    method: 'POST', protocol: 'https:', hostname: 'graph.facebook.com', path: `/v22.0/${fbPageId}/photos`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) },
  }, form);
}

async function cmdMetaTests(urlArg) {
  const env = loadEnv();
  const { META_PAGE_TOKEN, INSTAGRAM_ACCOUNT_ID, FACEBOOK_PAGE_ID } = env;
  if (!META_PAGE_TOKEN || !INSTAGRAM_ACCOUNT_ID || !FACEBOOK_PAGE_ID) throw new Error('Meta env vars missing in .env');
  const run = loadRun();
  const results = {};

  console.log('\n=== 1. IG single/story container (ig-create-container shape) ===');
  const r1 = await metaCreateContainer(INSTAGRAM_ACCOUNT_ID, META_PAGE_TOKEN, { image_url: urlArg, caption: 'Verify 12.2-03 IG single' });
  console.log(r1.statusCode, r1.body.toString('utf-8'));
  results.ig_single = { status: r1.statusCode, body: r1.body.toString('utf-8') };

  console.log('\n=== 2. IG Story container (ig-create-story-container shape) ===');
  const r2 = await metaCreateContainer(INSTAGRAM_ACCOUNT_ID, META_PAGE_TOKEN, { image_url: urlArg, media_type: 'STORIES' });
  console.log(r2.statusCode, r2.body.toString('utf-8'));
  results.ig_story = { status: r2.statusCode, body: r2.body.toString('utf-8') };

  console.log('\n=== 3. IG carousel child container (ig-create-child-container shape) ===');
  const r3 = await metaCreateContainer(INSTAGRAM_ACCOUNT_ID, META_PAGE_TOKEN, { image_url: urlArg, is_carousel_item: 'true' });
  console.log(r3.statusCode, r3.body.toString('utf-8'));
  results.ig_carousel_child = { status: r3.statusCode, body: r3.body.toString('utf-8') };

  console.log('\n=== 4. FB publish photo, published=false (fb-publish-photo shape, safe variant) ===');
  const r4 = await metaFbPhoto(FACEBOOK_PAGE_ID, META_PAGE_TOKEN, { url: urlArg, published: 'false' });
  console.log(r4.statusCode, r4.body.toString('utf-8'));
  results.fb_publish_photo_unpublished = { status: r4.statusCode, body: r4.body.toString('utf-8') };

  console.log('\n=== 5. FB carousel unpublished upload (fb-upload-photo-unpublished shape) ===');
  const r5 = await metaFbPhoto(FACEBOOK_PAGE_ID, META_PAGE_TOKEN, { url: urlArg, published: 'false', temporary: 'true' });
  console.log(r5.statusCode, r5.body.toString('utf-8'));
  results.fb_carousel_unpublished = { status: r5.statusCode, body: r5.body.toString('utf-8') };

  run.meta_tests = { url_used: urlArg, results };
  saveRun(run);

  const allOk = [r1, r2, r3, r4, r5].every(r => r.statusCode === 200);
  console.log('\nAll 5 Meta calls returned 200:', allOk);
}

async function cmdCleanup() {
  const run = loadRun();
  if (run.harness_id) {
    const deact = await n8nApi('POST', `/api/v1/workflows/${run.harness_id}/deactivate`, {});
    console.log('harness deactivate status:', deact.status);
    const del = await n8nApi('DELETE', `/api/v1/workflows/${run.harness_id}`);
    console.log('harness delete status:', del.status);
    const check = await n8nApi('GET', `/api/v1/workflows/${run.harness_id}`);
    console.log('harness GET after delete status:', check.status, '(expect 404)');
    run.cleanup_harness = { deactivate_status: deact.status, delete_status: del.status, get_after_delete_status: check.status };
  }
  const uploaded = run.uploaded_files || [];
  run.cleanup_files = [];
  for (const filePath of uploaded) {
    const del = await rehostDelete(filePath);
    const getAfter = await rehostGet(filePath);
    console.log(`DELETE ${filePath} -> ${del.statusCode}; GET after -> ${getAfter.statusCode} (expect 404)`);
    run.cleanup_files.push({ path: filePath, delete_status: del.statusCode, get_after_status: getAfter.statusCode });
  }
  saveRun(run);
}

async function cmdStatus() {
  console.log(JSON.stringify(loadRun(), null, 2));
}

const cmd = process.argv[2];
const arg = process.argv[3];
const cmds = {
  setup: cmdSetup,
  'seed-source-image': cmdSeedSourceImage,
  'exec-a': cmdExecA,
  'patch-bad-key': cmdPatchBadKey,
  'exec-b': cmdExecB,
  'restore-subworkflow': cmdRestoreSubworkflow,
  'meta-tests': () => cmdMetaTests(arg),
  cleanup: cmdCleanup,
  status: cmdStatus,
};

if (!cmd || !cmds[cmd]) {
  console.error('usage: node verify-rehost.mjs <setup|seed-source-image|exec-a|patch-bad-key|exec-b|restore-subworkflow|meta-tests <url>|cleanup|status>');
  process.exit(2);
}

cmds[cmd]().catch((e) => { console.error('FATAL:', e); process.exit(3); });
