// Phase 12.1-01 Task 1 — AFD + Task 2 Meta Graph API smoke/dry-run runner
// Usage: node smoke-test.mjs <AFD_HOST> <BLOB_PATH>
//   AFD_HOST   = e.g. propulsarcontent-a1b2c3d4.z01.azurefd.net (no protocol)
//   BLOB_PATH  = e.g. 12.1-smoke/smoke-test.png

import https from 'node:https';
import fs    from 'node:fs';
import path  from 'node:path';
import url   from 'node:url';
import { Buffer } from 'node:buffer';

const AFD_HOST  = process.argv[2];
const BLOB_PATH = process.argv[3];
if (!AFD_HOST || !BLOB_PATH) {
  console.error('usage: node smoke-test.mjs <AFD_HOST> <BLOB_PATH>');
  process.exit(2);
}

const ORIGIN_HOST = 'propulsarcontent.blob.core.windows.net';
const CONTAINER   = 'posts';

function httpRequest(opts, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers:    res.headers,
        body:       Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function head(hostname, pathname, userAgent) {
  return httpRequest({
    method: 'HEAD',
    hostname,
    path: pathname,
    headers: userAgent ? { 'User-Agent': userAgent } : {},
  });
}

async function get(hostname, pathname, userAgent) {
  return httpRequest({
    method: 'GET',
    hostname,
    path: pathname,
    headers: userAgent ? { 'User-Agent': userAgent } : {},
  });
}

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const text = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function metaCreateContainer(imageUrl, instagramAccountId, token) {
  const form = new URLSearchParams({
    image_url:    imageUrl,
    caption:      'pre-deploy-test-delete-12.1-01-T2',
    access_token: token,
  }).toString();
  return httpRequest({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/v22.0/${instagramAccountId}/media`,
    headers: {
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(form),
    },
  }, form);
}

async function metaDeleteContainer(containerId, token) {
  return httpRequest({
    method: 'DELETE',
    hostname: 'graph.facebook.com',
    path: `/v22.0/${containerId}?access_token=${encodeURIComponent(token)}`,
  });
}

(async () => {
  const report = { timestamp_utc: new Date().toISOString(), AFD_HOST, BLOB_PATH, tests: {} };

  const afdPath = `/${CONTAINER}/${BLOB_PATH}`;

  // ---- 1. Origin reachable without SAS (post-flip sanity)
  console.log('\n=== 1. Origin (blob.core.windows.net) HEAD without SAS ===');
  const t1 = await head(ORIGIN_HOST, afdPath);
  console.log(`status=${t1.statusCode} ctype=${t1.headers['content-type']} clen=${t1.headers['content-length']}`);
  report.tests.origin_no_sas = {
    status:         t1.statusCode,
    content_type:   t1.headers['content-type'] || null,
    content_length: t1.headers['content-length'] || null,
  };

  // ---- 2. AFD default UA
  console.log('\n=== 2. AFD HEAD default UA ===');
  const t2 = await head(AFD_HOST, afdPath);
  console.log(`status=${t2.statusCode} ctype=${t2.headers['content-type']} clen=${t2.headers['content-length']} x-cache=${t2.headers['x-cache']} x-azure-ref=${t2.headers['x-azure-ref']}`);
  report.tests.afd_default_ua = {
    status:         t2.statusCode,
    content_type:   t2.headers['content-type'] || null,
    content_length: t2.headers['content-length'] || null,
    x_cache:        t2.headers['x-cache']      || null,
    x_azure_ref:    t2.headers['x-azure-ref']  || null,
  };

  // ---- 3. AFD facebookexternalhit UA
  console.log('\n=== 3. AFD HEAD facebookexternalhit/1.1 UA ===');
  const t3 = await head(AFD_HOST, afdPath, 'facebookexternalhit/1.1');
  console.log(`status=${t3.statusCode} ctype=${t3.headers['content-type']} clen=${t3.headers['content-length']}`);
  report.tests.afd_fb_ua = {
    status:         t3.statusCode,
    content_type:   t3.headers['content-type'] || null,
    content_length: t3.headers['content-length'] || null,
  };

  // ---- 4. AFD full GET + PNG magic check
  console.log('\n=== 4. AFD full GET + PNG magic bytes check ===');
  const t4 = await get(AFD_HOST, afdPath);
  const pngMagic = t4.body.length >= 8 && t4.body.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  console.log(`status=${t4.statusCode} size=${t4.body.length} png_magic=${pngMagic}`);
  report.tests.afd_get_full = {
    status:         t4.statusCode,
    content_type:   t4.headers['content-type'] || null,
    size:           t4.body.length,
    png_magic_ok:   pngMagic,
  };

  // ---- 5. Meta Graph API dry-run (Task 2)
  console.log('\n=== 5. Meta Graph API dry-run (POST /media then DELETE) ===');
  const env = await loadEnv();
  if (!env.META_PAGE_TOKEN || !env.INSTAGRAM_ACCOUNT_ID) {
    console.log('SKIP: META_PAGE_TOKEN or INSTAGRAM_ACCOUNT_ID not set in .env');
    report.tests.meta_dry_run = { skipped: true };
  } else {
    const afdUrl = `https://${AFD_HOST}${afdPath}`;
    console.log(`POST https://graph.facebook.com/v22.0/${env.INSTAGRAM_ACCOUNT_ID}/media image_url=${afdUrl}`);
    const metaCreate = await metaCreateContainer(afdUrl, env.INSTAGRAM_ACCOUNT_ID, env.META_PAGE_TOKEN);
    const metaBody = metaCreate.body.toString('utf-8');
    console.log(`status=${metaCreate.statusCode} body=${metaBody}`);
    let containerId = null;
    try { containerId = JSON.parse(metaBody).id || null; } catch {}
    report.tests.meta_dry_run = {
      create_status:       metaCreate.statusCode,
      create_body:         metaBody,
      container_id:        containerId,
      afd_url_used:        afdUrl,
    };
    if (containerId) {
      const del = await metaDeleteContainer(containerId, env.META_PAGE_TOKEN);
      const delBody = del.body.toString('utf-8');
      console.log(`DELETE /${containerId} status=${del.statusCode} body=${delBody}`);
      report.tests.meta_dry_run.delete_status = del.statusCode;
      report.tests.meta_dry_run.delete_body   = delBody;
    } else {
      console.log('No container_id - skipping delete');
    }
  }

  // ---- Write report
  const outPath = path.resolve(
    process.cwd(),
    '.planning/phases/12.1-cdn-layer-azure-front-door-obsoletes-options-d-b-e/smoke-test-output.json'
  );
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n=== Report: ${outPath} ===`);

  // Exit nonzero if any AFD test failed (blocks commit)
  const allAfdOk = t2.statusCode === 200 && t3.statusCode === 200 && t4.statusCode === 200 && pngMagic;
  process.exit(allAfdOk ? 0 : 1);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(3);
});
