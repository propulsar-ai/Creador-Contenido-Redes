// Fire a brief directly to WEBHOOK_URL, bypassing the interactive Wizard.
// Usage: node fire-exec.mjs <exec_type>
//   exec_type: story-ig | story-igfb | single | carousel
//
// Reads WEBHOOK_URL + WHATSAPP_APPROVAL_NUMBER from .env at cwd.
// Prints response + appended exec metadata to stdout.

import https from 'node:https';
import http  from 'node:http';
import fs    from 'node:fs';
import path  from 'node:path';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';

const execType = process.argv[2];
if (!execType) {
  console.error('usage: node fire-exec.mjs <story-ig|story-igfb|single|carousel>');
  process.exit(2);
}

function loadEnv() {
  const text = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = loadEnv();
if (!env.WEBHOOK_URL || !env.WHATSAPP_APPROVAL_NUMBER) {
  console.error('WEBHOOK_URL or WHATSAPP_APPROVAL_NUMBER not set in .env');
  process.exit(1);
}

const now  = new Date();
const nowIso = now.toISOString();
const expiresIso = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

const TOPICS = {
  'story-ig':    'Automatización con IA: 3 errores comunes que paran a las pymes',
  'story-igfb':  'Agentes IA para atención al cliente 24/7 en WhatsApp',
  'single':      'Por qué n8n supera a Zapier para automatización avanzada',
  'carousel':    'Workflow en 4 pasos: IA que genera contenido y publica solo',
};

const briefs = {
  'story-ig': {
    topic: TOPICS['story-ig'],
    type: 'educational',
    angle: null,
    platforms: ['instagram'],
    image_model: 'ideogram',
    fal_model_id: null,
    has_own_image: false,
    image_url: null,
    has_text_in_image: true,
    approval_number: env.WHATSAPP_APPROVAL_NUMBER,
    timestamp: nowIso,
    publish_at: 'now',
    format: 'story',
    aspect_ratio: '9:16',
    num_images: 1,
    story_expires_at: expiresIso,
  },
  'story-igfb': {
    topic: TOPICS['story-igfb'],
    type: 'educational',
    angle: null,
    platforms: ['instagram', 'facebook'],
    image_model: 'ideogram',
    fal_model_id: null,
    has_own_image: false,
    image_url: null,
    has_text_in_image: true,
    approval_number: env.WHATSAPP_APPROVAL_NUMBER,
    timestamp: nowIso,
    publish_at: 'now',
    format: 'story',
    aspect_ratio: '9:16',
    num_images: 1,
    story_expires_at: expiresIso,
  },
  'single': {
    topic: TOPICS['single'],
    type: 'educational',
    angle: null,
    platforms: ['instagram', 'facebook'],
    image_model: 'flux',
    fal_model_id: 'fal-ai/flux-pro/v1.1',
    has_own_image: false,
    image_url: null,
    has_text_in_image: false,
    approval_number: env.WHATSAPP_APPROVAL_NUMBER,
    timestamp: nowIso,
    publish_at: 'now',
  },
  'carousel': {
    topic: TOPICS['carousel'],
    type: 'educational',
    angle: null,
    platforms: ['instagram', 'facebook'],
    image_model: 'ideogram',
    fal_model_id: null,
    has_own_image: false,
    image_url: null,
    has_text_in_image: true,
    approval_number: env.WHATSAPP_APPROVAL_NUMBER,
    timestamp: nowIso,
    publish_at: 'now',
    format: 'carousel',
    num_images: 3,
    image_prompts: [],
  },
};

const brief = briefs[execType];
if (!brief) {
  console.error('unknown exec_type:', execType);
  console.error('valid:', Object.keys(briefs).join(', '));
  process.exit(2);
}

const u = new URL(env.WEBHOOK_URL);
const client = u.protocol === 'https:' ? https : http;
const body = Buffer.from(JSON.stringify(brief), 'utf8');

console.log('===== FIRING EXEC =====');
console.log('type:', execType);
console.log('topic:', brief.topic);
console.log('format:', brief.format || 'single');
console.log('platforms:', brief.platforms.join('+'));
console.log('model:', brief.image_model);
console.log('webhook:', env.WEBHOOK_URL);
console.log('timestamp:', nowIso);
console.log('');

const req = client.request({
  hostname: u.hostname,
  port:     u.port || (u.protocol === 'https:' ? 443 : 80),
  path:     u.pathname,
  method:   'POST',
  headers: {
    'Content-Type':   'application/json',
    'Content-Length': body.length,
  },
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('status:', res.statusCode);
    console.log('response:', data.substring(0, 500));
    console.log('');
    console.log('===== NEXT STEPS =====');
    console.log('1. Wait ~60s for WhatsApp preview to arrive');
    console.log('2. Reply "SI" in WhatsApp to approve publish');
    console.log('3. Wait ~60-90s for publish to complete');
    console.log('4. Return to chat — Claude will fetch exec data and verify azurefd.net');
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});
req.on('error', e => { console.error('request err:', e.message); process.exit(3); });
req.write(body);
req.end();
