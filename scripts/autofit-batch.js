#!/usr/bin/env node

/**
 * Offline auto-fit batch runner (Phase 16, Plan 16-05, INTEG-05)
 *
 * Tunes Creatomate auto-fit/overflow against REAL GPT-4o caption variance, offline,
 * BEFORE production is touched by any live-fire. Generates ~10 real caption sets using
 * the EXACT hardened prompts currently deployed in n8n/workflow.json (extracted
 * programmatically — zero drift between this test and production), renders them through
 * the full Hybrid path (FAL Flux 2 Pro background + Creatomate typographic overlay,
 * INCLUDING the closing-slide-correct behavior: null background_prompt -> skip Flux
 * only, still render Creatomate), and writes PNGs + a spend/schema report to a gitignored
 * eval-output/autofit-<date>/ directory for direct visual inspection (Claude reads every
 * PNG with the Read tool — see 16-05-AUTOFIT.md).
 *
 * ZERO reimplementation of production prompts/parsing logic: the GPT-4o system+user
 * prompts (openai-text/openai-carousel) and the deterministic layout/schema logic
 * (parse-content/parse-carousel) are extracted from n8n/workflow.json by node id and
 * EXECUTED (via Node's vm module, with a minimal n8n-shaped sandbox: $json, $input, $)
 * exactly as n8n would run them — not copied by hand, so this batch can never silently
 * drift from what production actually sends/parses.
 *
 * The FAL/Creatomate HTTP call shape (callFalFluxBackground/callCreatomate/
 * substitutePlaceholders) is copied from scripts/eval-design-engines.js (Phase 15,
 * live-proven against the real APIs) rather than re-derived — see Research
 * Don't-Hand-Roll guidance. One fix applied here (not in the original): the placeholder
 * regex is widened to accept digits (chat-mockup.json's CHAT_LINE_1..4 tokens contain
 * digits, which the original [A-Z_]+ class silently failed to match — see 16-05-AUTOFIT.md
 * Finding 1).
 *
 * Usage:
 *   node scripts/autofit-batch.js --smoke              # 1 unit only, cheap sanity check
 *   node scripts/autofit-batch.js                       # full ~10-unit batch
 *   node scripts/autofit-batch.js --units single-veterinaria,carousel-precios
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ─────────────────────────────────────────────
// CLI flags
// ─────────────────────────────────────────────
const argv = process.argv.slice(2);
const isSmoke = argv.includes("--smoke");
function flagValue(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : def;
}
const unitsArg = flagValue("units", null);
const UNIT_IDS = unitsArg ? unitsArg.split(",").map((s) => s.trim()) : null;

// ─────────────────────────────────────────────
// HTTP helpers (copied verbatim from scripts/eval-design-engines.js — proven
// Phase 15 conventions: plain https module, no axios/node-fetch dependency)
// ─────────────────────────────────────────────
function httpRequest(urlStr, { method = "GET", headers = {}, body = null, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const bodyBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : null;
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      headers: bodyBuf ? { ...headers, "Content-Length": bodyBuf.length } : headers,
      timeout: timeoutMs,
    };
    const start = Date.now();
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, body: buf, latencyMs: Date.now() - start });
      });
    });
    req.on("timeout", () => req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${urlStr}`)));
    req.on("error", reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function httpJson(urlStr, opts = {}) {
  const res = await httpRequest(urlStr, opts);
  let json = null;
  try {
    json = JSON.parse(res.body.toString("utf8"));
  } catch {
    // non-JSON response, leave json null — caller inspects res.body
  }
  return { ...res, json };
}

async function downloadToFile(urlStr, destPath) {
  const res = await httpRequest(urlStr, { method: "GET" });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Download failed ${res.statusCode} for ${urlStr}`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, res.body);
  return { destPath, actualFormat: detectImageFormat(res.body) };
}

function detectImageFormat(buf) {
  if (buf.length >= 8 && buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (buf.length >= 3 && buf.slice(0, 3).toString("hex") === "ffd8ff") return "jpeg";
  return "unknown";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// Extract production prompts/parsing logic from n8n/workflow.json (zero drift)
// ─────────────────────────────────────────────
const WORKFLOW_PATH = path.join(__dirname, "..", "n8n", "workflow.json");
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"));

function findNode(id) {
  const n = workflow.nodes.find((n) => n.id === id);
  if (!n) throw new Error(`Node not found in n8n/workflow.json: "${id}"`);
  return n;
}
const openaiTextNode = findNode("openai-text");
const openaiCarouselNode = findNode("openai-carousel");
const parseContentNode = findNode("parse-content");
const parseCarouselNode = findNode("parse-carousel");

// n8n expression strings look like "={{ <js expr> }}" — strip the wrapper to get
// executable JS. Throws loud if a node's field isn't actually an n8n expression
// (fail fast rather than silently evaluating garbage).
function stripN8nExpr(raw) {
  const m = raw.match(/^=\{\{([\s\S]*)\}\}$/);
  if (!m) throw new Error(`Not an n8n expression (missing ={{ }} wrapper): ${String(raw).slice(0, 80)}`);
  return m[1].trim();
}

// Builds the EXACT { messages, temperature } GPT-4o call payload production would send,
// by executing the real jsonBody expression from workflow.json with $json.body = brief.
// Not a reimplementation — the literal production expression, run with a real n8n-shaped
// input object, so the test prompt can never silently drift from the deployed one.
function buildChatPayload(node, briefBody) {
  const expr = stripN8nExpr(node.parameters.jsonBody);
  const sandbox = { $json: { body: briefBody }, JSON, String, Boolean };
  vm.createContext(sandbox);
  const jsonStr = vm.runInContext(expr, sandbox, { timeout: 5000 });
  return JSON.parse(jsonStr);
}

// Executes an n8n Code node's jsCode (runOnceForAllItems convention: reads via
// $input.first()) against a simulated single-item input, exactly as n8n would run it.
// Zero drift: this is the real parse-content/parse-carousel deterministic-layout logic,
// not a hand-copied reimplementation — if that logic changes in workflow.json, this
// batch automatically picks up the change on its next run.
function runN8nCodeNode(node, { rawContent, briefBody }) {
  const sandbox = {
    console,
    $input: { first: () => ({ json: { choices: [{ message: { content: rawContent } }] } }) },
    // The real code references $('🎯 Webhook Trigger').first().json.body — name is
    // ignored here since this batch only ever simulates a single upstream node.
    $: () => ({ first: () => ({ json: { body: briefBody } }) }),
  };
  vm.createContext(sandbox);
  const wrapped = `(function(){\n${node.parameters.jsCode}\n})()`;
  const result = vm.runInContext(wrapped, sandbox, { timeout: 5000 });
  if (Array.isArray(result)) return result[0].json;
  return result;
}

// ─────────────────────────────────────────────
// Azure OpenAI (AOAI) caller — mirrors production's raw HTTP Request node
// (openai-text/openai-carousel: POST .../openai/deployments/gpt-4o/chat/completions,
// api-version 2024-10-21, credential "AOAI-ApiKey-Header" -> standard Azure OpenAI
// REST auth is the `api-key` header, not Bearer).
// ─────────────────────────────────────────────
async function callAOAI(payload) {
  if (!process.env.AOAI_API_KEY || !process.env.AOAI_ENDPOINT) {
    throw new Error("AOAI_API_KEY / AOAI_ENDPOINT not set in local .env (see Plan 15-03 / 16-05-PLAN.md)");
  }
  const url = `${process.env.AOAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21`;
  const res = await httpJson(url, {
    method: "POST",
    headers: { "api-key": process.env.AOAI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`AOAI ${res.statusCode}: ${res.body.toString("utf8").slice(0, 500)}`);
  }
  const content = res.json?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`AOAI response missing choices[0].message.content: ${JSON.stringify(res.json).slice(0, 300)}`);
  return content;
}

// ─────────────────────────────────────────────
// FAL Flux 2 Pro background caller (copied from scripts/eval-design-engines.js
// callFalFluxBackground — same endpoint/params, byte-identical prompt suffix/palette).
// ─────────────────────────────────────────────
async function callFalFluxBackground(backgroundPrompt, falImageSize) {
  const body = JSON.stringify({
    prompt: `${backgroundPrompt} — style: dark background #070A18, purple to magenta gradient accents (#8000A8 to #BA00E0), professional high-quality social media graphic, ultra detailed, 4K`,
    image_size: falImageSize,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "png",
  });
  const res = await httpJson("https://fal.run/fal-ai/flux-pro/v1.1", {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_API_KEY}`, "Content-Type": "application/json" },
    body,
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`FAL Flux ${res.statusCode}: ${res.body.toString("utf8").slice(0, 300)}`);
  }
  const imageUrl = res.json?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`FAL Flux response missing images[0].url: ${JSON.stringify(res.json).slice(0, 300)}`);
  return { imageUrl, latencyMs: res.latencyMs, costUsd: 0.03 };
}

// ─────────────────────────────────────────────
// Creatomate caller + placeholder substitution (copied from
// scripts/eval-design-engines.js callCreatomate/substitutePlaceholders).
//
// FIX (not in the original harness — Finding 1, see 16-05-AUTOFIT.md): widened the
// placeholder regex from [A-Z_]+ to [A-Z0-9_]+ so chat-mockup.json's numbered tokens
// ({{CHAT_LINE_1}}..{{CHAT_LINE_4}}) actually get substituted. The original regex
// silently left them as literal "{{CHAT_LINE_1}}" text in the render — a real bug,
// just never exercised because no caller had rendered chat-mockup.json until this plan.
// ─────────────────────────────────────────────
const CREATOMATE_BASES = ["https://api.creatomate.com/v1", "https://api.creatomate.com/v2"];

function substitutePlaceholders(obj, values) {
  const json = JSON.stringify(obj);
  const replaced = json.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (m, key) => {
    const v = values[key];
    return v == null ? "" : String(v).replace(/"/g, '\\"');
  });
  return JSON.parse(replaced);
}

function loadCreatomateTemplate(layout) {
  const templatesDir = path.join(__dirname, "..", "creatomate", "templates");
  const file = path.join(templatesDir, `${layout}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function callCreatomate({ layout, values, width, height, backgroundUrl }) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) throw new Error("CREATOMATE_API_KEY not set in local .env");

  let templateObj = loadCreatomateTemplate(layout);
  if (!templateObj) throw new Error(`creatomate/templates/${layout}.json not found`);
  templateObj = substitutePlaceholders(templateObj, { ...values, BACKGROUND_URL: backgroundUrl || "" });
  const renderBody = JSON.stringify({
    output_format: "png",
    width,
    height,
    source: { elements: templateObj.elements },
  });
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  let res, base;
  for (base of CREATOMATE_BASES) {
    res = await httpJson(`${base}/renders`, { method: "POST", headers, body: renderBody });
    if (res.statusCode !== 404) break;
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Creatomate ${res.statusCode}: ${res.body.toString("utf8").slice(0, 300)}`);
  }
  const renderId = Array.isArray(res.json) ? res.json[0]?.id : res.json?.id;
  let url = Array.isArray(res.json) ? res.json[0]?.url : res.json?.url;
  let status = Array.isArray(res.json) ? res.json[0]?.status : res.json?.status;

  const start = Date.now();
  while (status !== "succeeded" && Date.now() - start < 120000) {
    if (status === "failed") throw new Error(`Creatomate render ${renderId} failed`);
    await sleep(3000);
    const poll = await httpJson(`${base}/renders/${renderId}`, { headers });
    status = poll.json?.status;
    url = poll.json?.url || url;
  }
  if (status !== "succeeded" || !url) throw new Error(`Creatomate render ${renderId} did not succeed in time`);
  // "1 image = 1 credit" (Creatomate official pricing docs, confirmed Plan 16-01) — 1
  // credit per successful render regardless of layout complexity.
  return { imageUrl: url, latencyMs: Date.now() - start, creditsUsed: 1, sourceFormat: "png" };
}

// ─────────────────────────────────────────────
// Brief set — ~10 real GPT-4o output units, stress-weighted per plan's own spec:
// 4 single + 2 story + 2 carousels (4-5 slides each -> ~9 slide units). Topics chosen
// for length/diacritics/punctuation stress (16-05-PLAN.md Task 1 step 2).
// ─────────────────────────────────────────────
const BRIEFS = [
  {
    id: "single-veterinaria",
    format: "single",
    type: "case_study",
    topic: "Automatización para clínica veterinaria: cómo no perder un cliente un domingo a la noche",
    angle: null,
    note: "Historical overflow case — the real 'veterinaria s.' wrap bug (16-CONTEXT.md).",
  },
  {
    id: "single-peluqueria",
    format: "single",
    type: "educational",
    topic: "Señales de que tu peluquería pierde años de clientes: ¿cuándo automatizar?",
    angle: null,
    note: "ñ/accent-heavy stress case.",
  },
  {
    id: "single-precios",
    format: "single",
    type: "authority",
    topic: "Cuánto cuesta automatizar tu PYME en 2026: precios reales y % de ahorro (30%-50%)",
    angle: null,
    note: "Numbers/symbols stress case.",
  },
  {
    id: "single-chat-concept",
    format: "single",
    type: "case_study",
    topic: "Chatbot de WhatsApp que agenda turnos 24/7 para una clínica veterinaria",
    angle: null,
    isChatConcept: true,
    note: "Chat-concept case_study — also drives the one-off chat-mockup.json render.",
  },
  {
    id: "story-veterinaria",
    format: "story",
    type: "case_study",
    topic: "Automatización para clínica veterinaria: cómo no perder un cliente un domingo a la noche",
    angle: null,
  },
  {
    id: "story-peluqueria",
    format: "story",
    type: "educational",
    topic: "Señales de que tu peluquería pierde años de clientes: ¿cuándo automatizar?",
    angle: null,
  },
  {
    id: "carousel-peluqueria",
    format: "carousel",
    type: "educational",
    topic: "Señales de que tu peluquería pierde años de clientes: ¿cuándo automatizar?",
    angle: null,
    num_images: 5,
  },
  {
    id: "carousel-precios",
    format: "carousel",
    type: "authority",
    topic: "Cuánto cuesta automatizar tu PYME en 2026: precios reales y % de ahorro (30%-50%)",
    angle: null,
    num_images: 4,
  },
];

// Real castellano chat lines for the one-off chat-mockup.json render (Task 1 step 2 /
// step 4). chat-mockup is NOT wired into the GPT-4o schema this phase (16-03-SUMMARY.md)
// so these are hand-authored evidence-only lines — accents + punctuation + an emoji,
// deliberately stress-testing the same auto-fit floor as everything else in this batch.
const CHAT_MOCKUP_LINES = {
  CHAT_LINE_1: "Hola! ¿Tienen turno para mañana a las 10hs?",
  CHAT_LINE_2: "¡Sí! Tenemos disponible a las 10:15hs, ¿te reservo?",
  CHAT_LINE_3: "Dale, perfecto 👍",
  CHAT_LINE_4: "Turno confirmado ✅ Te esperamos mañana a las 10:15hs",
};

const ASPECT_FAL = {
  single: "square_hd",
  story: { width: 1080, height: 1920 },
  carousel: "square_hd",
};
const DIMENSIONS = {
  single: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  carousel: { w: 1080, h: 1080 },
};

// Parses a raw GPT-4o content string the same way production's parse-content/
// parse-carousel do (strip ```json fences, trim, JSON.parse). On failure, dumps the
// full raw string to runDir/debug-<unitId>-raw.txt (production's own error only prints
// the first 200 chars) so a malformed-JSON finding can be fully inspected, then rethrows.
function safeJsonParse(raw, unitId, runDir) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const debugFile = path.join(runDir, `debug-${unitId}-raw.txt`);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(debugFile, raw);
    throw new Error(`[${unitId}] AOAI response is not valid JSON (${e.message}) — full raw content dumped to ${debugFile}`);
  }
}

function nowBody(brief) {
  return {
    topic: brief.topic,
    type: brief.type,
    angle: brief.angle,
    platforms: ["instagram", "facebook"],
    format: brief.format,
    num_images: brief.num_images || undefined,
    has_text_in_image: false,
    background_prompt: undefined,
    approval_number: "34612345678",
    timestamp: new Date().toISOString(),
    publish_at: "now",
  };
}

// ─────────────────────────────────────────────
// Schema validation (Task 1 step 3) — asserts every GPT-4o response parses and carries
// the fields the Hybrid render path actually needs.
// ─────────────────────────────────────────────
function validateSingleOrStorySchema(unitId, parsed) {
  const problems = [];
  if (typeof parsed.headline !== "string" || !parsed.headline.trim()) problems.push("missing/empty headline");
  if (typeof parsed.badge !== "string" || !parsed.badge.trim()) problems.push("missing/empty badge");
  if (typeof parsed.cta !== "string" || !parsed.cta.trim()) problems.push("missing/empty cta");
  if (typeof parsed.background_prompt !== "string" || !parsed.background_prompt.trim()) problems.push("missing/empty background_prompt");
  // body is allowed to be '' per parse-content's own `design.body || ''` fallback.
  if (problems.length) throw new Error(`[${unitId}] schema validation FAILED: ${problems.join("; ")}`);
  return true;
}

function validateCarouselSchema(unitId, parsed, expectedSlides) {
  const problems = [];
  const slides = parsed.slides || [];
  if (slides.length !== expectedSlides) problems.push(`expected ${expectedSlides} slides, got ${slides.length}`);
  slides.forEach((s, i) => {
    const label = `slide ${s.slide_num ?? i + 1}`;
    if (typeof s.headline !== "string" || !s.headline.trim()) problems.push(`${label}: missing/empty headline`);
    if (typeof s.badge !== "string" || !s.badge.trim()) problems.push(`${label}: missing/empty badge`);
    if (s.layout === "carousel-closing") {
      if (s.background_prompt !== null) problems.push(`${label}: closing slide background_prompt not forced null (got ${JSON.stringify(s.background_prompt)})`);
      if (typeof s.cta !== "string" || !s.cta.trim()) problems.push(`${label}: closing slide missing cta`);
    } else {
      if (typeof s.background_prompt !== "string" || !s.background_prompt.trim()) problems.push(`${label}: missing/empty background_prompt`);
    }
  });
  if (problems.length) throw new Error(`[${unitId}] carousel schema validation FAILED: ${problems.join("; ")}`);
  return true;
}

// ─────────────────────────────────────────────
// Render one image unit through the full Hybrid path — closing-slide-correct:
// null background_prompt -> skip Flux ONLY, still render via Creatomate.
//
// Split into 2 stages (getBackgroundUrl / renderWithBackground) so the SAME Flux
// background can be reused by a second render of the same unit (the chat-mockup
// evidence render reuses its parent single-brief's background instead of double-
// spending a Flux call for what is visually the same scene).
// ─────────────────────────────────────────────
async function getBackgroundUrl(backgroundPrompt, falImageSize, spend) {
  if (!backgroundPrompt) {
    spend.fluxSkipped++;
    return null;
  }
  const bg = await callFalFluxBackground(backgroundPrompt, falImageSize);
  spend.fluxCalls++;
  spend.fluxCostUsd += bg.costUsd;
  return bg.imageUrl;
}

async function renderWithBackground({ slug, layout, values, backgroundUrl, w, h, outDir, spend }) {
  const overlay = await callCreatomate({ layout, values, width: w, height: h, backgroundUrl });
  spend.creatomateCalls++;
  spend.creatomateCredits += overlay.creditsUsed;
  const destFile = path.join(outDir, `${slug}.png`);
  const dl = await downloadToFile(overlay.imageUrl, destFile);
  return { slug, layout, destFile: path.relative(outDir, destFile), sourceFormat: dl.actualFormat, hadBackground: Boolean(backgroundUrl) };
}

async function renderUnit({ slug, layout, values, backgroundPrompt, w, h, falImageSize, outDir, spend }) {
  const backgroundUrl = await getBackgroundUrl(backgroundPrompt, falImageSize, spend);
  return renderWithBackground({ slug, layout, values, backgroundUrl, w, h, outDir, spend });
}

// ─────────────────────────────────────────────
// Run orchestration
// ─────────────────────────────────────────────
function timestampDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `autofit-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function run() {
  let briefs = UNIT_IDS ? BRIEFS.filter((b) => UNIT_IDS.includes(b.id)) : BRIEFS;
  if (isSmoke) briefs = briefs.slice(0, 1);

  const runDir = path.join(__dirname, "..", "eval-output", timestampDir());
  fs.mkdirSync(runDir, { recursive: true });

  const spend = { fluxCalls: 0, fluxCostUsd: 0, fluxSkipped: 0, creatomateCalls: 0, creatomateCredits: 0, aoaiCalls: 0 };
  const results = [];
  const errors = [];
  const gptOutputs = [];

  for (const brief of briefs) {
    try {
      console.log(`\n=== [${brief.id}] format=${brief.format} type=${brief.type} ===`);
      const body = nowBody(brief);

      if (brief.format === "carousel") {
        const payload = buildChatPayload(openaiCarouselNode, body);
        console.log(`  -> AOAI (carousel, ${body.num_images} slides) ...`);
        const raw = await callAOAI(payload);
        spend.aoaiCalls++;
        const parsedRaw = safeJsonParse(raw, brief.id, runDir);
        const design = runN8nCodeNode(parseCarouselNode, { rawContent: raw, briefBody: body });
        gptOutputs.push({ unit: brief.id, rawParsed: parsedRaw, design });
        validateCarouselSchema(brief.id, design, brief.num_images);
        console.log(`  schema OK (${design.slides.length} slides, estructura=${design.estructura})`);

        for (const slide of design.slides) {
          const slug = `${brief.id}_slide${slide.slide_num}_${slide.layout}`;
          console.log(`  -> render ${slug} (needs_flux=${Boolean(slide.background_prompt)}) ...`);
          const r = await renderUnit({
            slug,
            layout: slide.layout,
            values: { HEADLINE: slide.headline, BODY: slide.body || "", BADGE: slide.badge, CTA: slide.cta || "" },
            backgroundPrompt: slide.background_prompt,
            w: DIMENSIONS.carousel.w,
            h: DIMENSIONS.carousel.h,
            falImageSize: ASPECT_FAL.carousel,
            outDir: runDir,
            spend,
          });
          results.push({ ...r, briefId: brief.id, format: "carousel" });
          console.log(`     OK -> ${r.destFile}`);
        }
      } else {
        const payload = buildChatPayload(openaiTextNode, body);
        console.log(`  -> AOAI (${brief.format}) ...`);
        const raw = await callAOAI(payload);
        spend.aoaiCalls++;
        const parsedRaw = safeJsonParse(raw, brief.id, runDir);
        const design = runN8nCodeNode(parseContentNode, { rawContent: raw, briefBody: body });
        gptOutputs.push({ unit: brief.id, rawParsed: parsedRaw, design });
        validateSingleOrStorySchema(brief.id, design);
        console.log(`  schema OK (headline="${design.headline.slice(0, 40)}...")`);

        const slug = `${brief.id}`;
        const backgroundUrl = await getBackgroundUrl(design.background_prompt, ASPECT_FAL[brief.format], spend);
        const r = await renderWithBackground({
          slug,
          layout: brief.format, // 'single' | 'story'
          values: { HEADLINE: design.headline, BODY: design.body, BADGE: design.badge, CTA: design.cta },
          backgroundUrl,
          w: DIMENSIONS[brief.format].w,
          h: DIMENSIONS[brief.format].h,
          outDir: runDir,
          spend,
        });
        results.push({ ...r, briefId: brief.id, format: brief.format });
        console.log(`  OK -> ${r.destFile}`);

        // One-off chat-mockup.json render (Task 1 step 4) — reuses the SAME Flux
        // background just generated above (no extra Flux spend) but composes real
        // castellano chat bubbles via Creatomate on top of it.
        if (brief.isChatConcept && !isSmoke) {
          console.log(`  -> chat-mockup render (reusing this unit's background) ...`);
          const chatR = await renderWithBackground({
            slug: `${brief.id}_chat-mockup`,
            layout: "chat-mockup",
            values: { HEADLINE: design.headline, BADGE: design.badge, ...CHAT_MOCKUP_LINES },
            backgroundUrl,
            w: 1080,
            h: 1080,
            outDir: runDir,
            spend,
          });
          results.push({ ...chatR, briefId: brief.id, format: "chat-mockup" });
          console.log(`     OK -> ${chatR.destFile}`);
        }
      }
    } catch (err) {
      console.error(`  FAILED [${brief.id}]: ${err.message}`);
      errors.push({ unit: brief.id, error: err.message });
    }
  }

  const runMeta = {
    ranAt: new Date().toISOString(),
    smoke: isSmoke,
    briefIds: briefs.map((b) => b.id),
    spend,
    results,
    errors,
  };
  fs.writeFileSync(path.join(runDir, "run-meta.json"), JSON.stringify(runMeta, null, 2));
  fs.writeFileSync(path.join(runDir, "gpt-outputs.json"), JSON.stringify(gptOutputs, null, 2));

  console.log(`\n\nRun complete. ${results.length} renders, ${errors.length} errors.`);
  console.log(`AOAI calls: ${spend.aoaiCalls} | Flux calls: ${spend.fluxCalls} (~$${spend.fluxCostUsd.toFixed(2)}) | Flux skipped (closing slides): ${spend.fluxSkipped} | Creatomate renders: ${spend.creatomateCalls} (${spend.creatomateCredits} credits)`);
  console.log(`Output: ${runDir}`);
  return runDir;
}

(async () => {
  try {
    await run();
  } catch (err) {
    console.error("Batch fatal error:", err);
    process.exit(1);
  }
})();
