// Phase 12.2-01 Task 3 — rehost-service live smoke test:
// upload -> serve (public, no auth) -> Meta container-creation -> delete -> 404
// + negative-auth proof (PUT/DELETE without X-Api-Key rejected).
//
// Usage: REHOST_API_KEY=<key> node smoke-test.mjs
// Reads META_PAGE_TOKEN / INSTAGRAM_ACCOUNT_ID from this repo's .env (root).
// Never hardcodes secrets — REHOST_API_KEY must be passed via env var.

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

const BASE_HOST = 'rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host';
const TEST_PATH = '/files/2026/07/31/smoke-test.png';
const REHOST_API_KEY = process.env.REHOST_API_KEY;

if (!REHOST_API_KEY) {
  console.error('FATAL: REHOST_API_KEY env var not set. Run: REHOST_API_KEY=<key> node smoke-test.mjs');
  process.exit(2);
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const text = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

// Generates a valid 1080x1080 solid-color PNG (>=320px min, passes Meta's image validator)
function genValidPng() {
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
  const R = 24, G = 133, B = 224; // Propulsar-blue-ish
  const row = Buffer.alloc(1 + W * 3);
  row[0] = 0;
  for (let x = 0; x < W; x++) { row[1 + x * 3] = R; row[1 + x * 3 + 1] = G; row[1 + x * 3 + 2] = B; }
  const raw = Buffer.alloc(H * row.length);
  for (let y = 0; y < H; y++) row.copy(raw, y * row.length);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function request(opts, body = null) {
  const lib = opts.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function metaCreateContainer(imageUrl, instagramAccountId, token) {
  const form = new URLSearchParams({
    image_url: imageUrl,
    caption: 'Test rehost Hostinger - 12.2 smoke',
    access_token: token,
  }).toString();
  return request({
    method: 'POST',
    protocol: 'https:',
    hostname: 'graph.facebook.com',
    path: `/v22.0/${instagramAccountId}/media`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(form),
    },
  }, form);
}

(async () => {
  const report = { timestamp_utc: new Date().toISOString(), base_host: BASE_HOST, tests: {} };
  const png = genValidPng();

  // ---- 1. PUT with correct auth ----
  console.log('\n=== 1. PUT with X-Api-Key ===');
  const t1 = await request({
    method: 'PUT', protocol: 'https:', hostname: BASE_HOST, path: TEST_PATH,
    headers: { 'X-Api-Key': REHOST_API_KEY, 'Content-Type': 'image/png', 'Content-Length': png.length },
  }, png);
  console.log(`status=${t1.statusCode} body=${t1.body.toString('utf-8')}`);
  report.tests.put_with_auth = { status: t1.statusCode, body: t1.body.toString('utf-8') };

  // ---- 2. GET with zero auth headers (Meta's exact fetcher shape) ----
  console.log('\n=== 2. GET with zero auth headers ===');
  const t2 = await request({ method: 'GET', protocol: 'https:', hostname: BASE_HOST, path: TEST_PATH });
  const pngMagic = t2.body.length >= 8 && t2.body.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  console.log(`status=${t2.statusCode} ctype=${t2.headers['content-type']} size=${t2.body.length} png_magic=${pngMagic}`);
  report.tests.get_no_auth = {
    status: t2.statusCode,
    content_type: t2.headers['content-type'] || null,
    size: t2.body.length,
    png_magic_ok: pngMagic,
    bytes_match_upload: t2.body.equals(png),
  };

  // ---- 3. Meta Graph API container creation (no media_publish) ----
  console.log('\n=== 3. Meta Graph API POST /media (container creation only) ===');
  const env = loadEnv();
  const publicUrl = `https://${BASE_HOST}${TEST_PATH}`;
  if (!env.META_PAGE_TOKEN || !env.INSTAGRAM_ACCOUNT_ID) {
    console.log('SKIP: META_PAGE_TOKEN or INSTAGRAM_ACCOUNT_ID not set in .env');
    report.tests.meta_container = { skipped: true };
  } else {
    console.log(`POST https://graph.facebook.com/v22.0/${env.INSTAGRAM_ACCOUNT_ID}/media image_url=${publicUrl}`);
    const metaCreate = await metaCreateContainer(publicUrl, env.INSTAGRAM_ACCOUNT_ID, env.META_PAGE_TOKEN);
    const metaBody = metaCreate.body.toString('utf-8');
    console.log(`status=${metaCreate.statusCode} body=${metaBody}`);
    let containerId = null;
    try { containerId = JSON.parse(metaBody).id || null; } catch {}
    report.tests.meta_container = {
      status: metaCreate.statusCode,
      body: metaBody,
      container_id: containerId,
      image_url_used: publicUrl,
      note: 'container created only — media_publish was NEVER called, no real post exists from this test.',
    };
    if (containerId) {
      const del = await request({
        method: 'DELETE', protocol: 'https:', hostname: 'graph.facebook.com',
        path: `/v22.0/${containerId}?access_token=${encodeURIComponent(env.META_PAGE_TOKEN)}`,
      });
      console.log(`DELETE container /${containerId} status=${del.statusCode} body=${del.body.toString('utf-8')}`);
      report.tests.meta_container.container_delete_status = del.statusCode;
    }
  }

  // ---- 4. DELETE with auth, then re-GET (no auth) expect 404 ----
  console.log('\n=== 4. DELETE with X-Api-Key, then GET (no auth) expect 404 ===');
  const t4del = await request({
    method: 'DELETE', protocol: 'https:', hostname: BASE_HOST, path: TEST_PATH,
    headers: { 'X-Api-Key': REHOST_API_KEY },
  });
  console.log(`DELETE status=${t4del.statusCode} body=${t4del.body.toString('utf-8')}`);
  const t4get = await request({ method: 'GET', protocol: 'https:', hostname: BASE_HOST, path: TEST_PATH });
  console.log(`GET after delete status=${t4get.statusCode}`);
  report.tests.delete_then_404 = {
    delete_status: t4del.statusCode,
    delete_body: t4del.body.toString('utf-8'),
    get_after_delete_status: t4get.statusCode,
  };

  // ---- 5. Negative-auth: PUT and DELETE with wrong/missing key ----
  console.log('\n=== 5. Negative-auth checks (expect 401) ===');
  const negPath = '/files/2026/07/31/negative-auth-test.png';
  const t5put = await request({
    method: 'PUT', protocol: 'https:', hostname: BASE_HOST, path: negPath,
    headers: { 'X-Api-Key': 'wrong-key-on-purpose', 'Content-Type': 'image/png', 'Content-Length': png.length },
  }, png);
  console.log(`PUT wrong-key status=${t5put.statusCode}`);
  const t5del = await request({
    method: 'DELETE', protocol: 'https:', hostname: BASE_HOST, path: negPath,
  });
  console.log(`DELETE no-key status=${t5del.statusCode}`);
  report.tests.negative_auth = {
    put_wrong_key_status: t5put.statusCode,
    delete_no_key_status: t5del.statusCode,
  };

  // ---- Write report ----
  const outPath = path.resolve(process.cwd(), '.planning/phases/12.2-hostinger-vps-re-host-layer/smoke-test-output.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n=== Report: ${outPath} ===`);

  const putOk = t1.statusCode === 200;
  const getOk = t2.statusCode === 200 && pngMagic && t2.body.equals(png);
  const metaOk = report.tests.meta_container.skipped || (report.tests.meta_container.status === 200 && !!report.tests.meta_container.container_id);
  const deleteOk = t4del.statusCode === 200 && t4get.statusCode === 404;
  const negOk = t5put.statusCode === 401 && t5del.statusCode === 401;

  const allOk = putOk && getOk && metaOk && deleteOk && negOk;
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(3);
});
