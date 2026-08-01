#!/usr/bin/env node

/**
 * Eval harness — standalone comparison of design engines (Phase 15, EVAL-03/04/05)
 *
 * Renders the frozen brief set (scripts/eval-briefs.json) through Ideogram v3
 * (production-replica baseline), Creatomate, Gamma, and a Flux+Creatomate hybrid,
 * then generates a blind side-by-side HTML gallery.
 *
 * ZERO contact with n8n, content_sessions, Google Sheets, or Meta Graph API —
 * this is a pure, disposable side-pipeline. It calls Ideogram/FAL/Creatomate/Gamma
 * APIs directly via plain https requests, mirroring the CLI/dotenv/HTTP-helper
 * conventions already used elsewhere in scripts/ (no axios/node-fetch dependency).
 *
 * Usage:
 *   node scripts/eval-design-engines.js --smoke --engines ideogram
 *   node scripts/eval-design-engines.js --engines ideogram,creatomate,gamma,hybrid
 *   node scripts/eval-design-engines.js --briefs veterinaria-caso-exito --formats single,story
 *   node scripts/eval-design-engines.js --gallery-only eval-output/2026-08-01_1200
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ─────────────────────────────────────────────
// CLI flags
// ─────────────────────────────────────────────
const argv = process.argv.slice(2);
function flagValue(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : def;
}
const isSmoke = argv.includes("--smoke");
const enginesArg = flagValue("engines", "ideogram,creatomate,gamma,hybrid");
const briefsArg = flagValue("briefs", null);
const formatsArg = flagValue("formats", "single,carousel,story");
const galleryOnlyDir = flagValue("gallery-only", null);

const ENGINES = enginesArg.split(",").map((s) => s.trim());
const FORMATS = formatsArg.split(",").map((s) => s.trim());
const BRIEF_IDS = briefsArg ? briefsArg.split(",").map((s) => s.trim()) : null;

// ─────────────────────────────────────────────
// HTTP helpers (plain https module, no axios/node-fetch — matches existing scripts/ convention)
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

// Real magic-byte format detection (Pitfall 5 — normalize/label true format, don't guess
// from the file extension). PNG normalization is attempted at the request level per engine
// where the vendor API supports it (e.g. FAL's output_format); when a vendor still returns
// JPEG (observed for FAL Flux, which has no output_format param on this model), the actual
// format is recorded here and surfaced in run-meta.json rather than silently mislabeled.
function detectImageFormat(buf) {
  if (buf.length >= 8 && buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (buf.length >= 3 && buf.slice(0, 3).toString("hex") === "ffd8ff") return "jpeg";
  return "unknown";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// Briefs
//
// NOTE (EVAL-03): this harness's only outbound hosts are api.ideogram.ai,
// api.creatomate.com, api.gamma.app, and fal.run — no n8n, no session store,
// no spreadsheet, no social publishing API is ever referenced below.
// ─────────────────────────────────────────────
const briefsPath = path.join(__dirname, "eval-briefs.json");
const briefsData = JSON.parse(fs.readFileSync(briefsPath, "utf8"));

function selectBriefs() {
  let briefs = briefsData.briefs;
  if (BRIEF_IDS) briefs = briefs.filter((b) => BRIEF_IDS.includes(b.id));
  if (isSmoke) briefs = briefs.slice(0, 1);
  return briefs;
}

// ─────────────────────────────────────────────
// Aspect ratio helpers
// ─────────────────────────────────────────────
const ASPECT = {
  single: { ideogram: "ASPECT_1_1", w: 1080, h: 1080, fal: "square_hd" },
  carousel: { ideogram: "ASPECT_1_1", w: 1080, h: 1080, fal: "square_hd" },
  story: { ideogram: "ASPECT_9_16", w: 1080, h: 1920, fal: { width: 1080, height: 1920 } },
};

// ─────────────────────────────────────────────
// ENGINE 1 — Ideogram baseline (verbatim production replica)
//
// Source of truth: n8n/workflow.json nodes "🔤 Ideogram v3" (id: ideogram-generate)
// and "🔤 Ideogram v3 — Story" (id: ideogram-generate-story).
// Endpoint/model/magic_prompt_option/style_type/aspect_ratio enum copied verbatim.
//
// SINGLE DOCUMENTED DEVIATION (per 15-CONTEXT.md canonical brand spec): production's
// hardcoded prompt-suffix color "#1a1a2e" is replaced with the canonical palette
// (#070A18 background, #8000A8→#BA00E0 gradient, #00E5FF cyan accent) so every engine
// under test is judged against the SAME target aesthetic, not a stale approximation.
// Every other param (endpoint, model, magic_prompt_option, style_type, aspect enum)
// is byte-identical to production.
// ─────────────────────────────────────────────
async function callIdeogram(imagePrompt, format) {
  const isStory = format === "story";
  const suffix = isStory
    ? " — vertical 9:16 Story composition, subject centered in upper-middle third, safe zone top and bottom 14% for UI, dark background #070A18, purple and magenta gradient accents (#8000A8 to #BA00E0), cyan accent #00E5FF, bold readable typography"
    : " — professional design, dark background #070A18, purple and magenta gradient elements (#8000A8 to #BA00E0), cyan accent #00E5FF, bold readable typography, social media post";
  const prompt = imagePrompt.includes("—") ? imagePrompt : `${imagePrompt}${suffix}`;
  const body = JSON.stringify({
    image_request: {
      prompt,
      aspect_ratio: isStory ? "ASPECT_9_16" : "ASPECT_1_1",
      model: "V_2_TURBO",
      magic_prompt_option: "OFF",
      style_type: "DESIGN",
    },
  });
  const res = await httpJson("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": process.env.IDEOGRAM_API_KEY, "Content-Type": "application/json" },
    body,
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Ideogram ${res.statusCode}: ${res.body.toString("utf8").slice(0, 300)}`);
  }
  const imageUrl = res.json?.data?.[0]?.url;
  if (!imageUrl) throw new Error(`Ideogram response missing data[0].url: ${JSON.stringify(res.json).slice(0, 300)}`);
  return { imageUrl, latencyMs: res.latencyMs, costUsd: 0.06, sourceFormat: "jpeg-or-png-vendor-default" };
}

// ─────────────────────────────────────────────
// ENGINE 2 — Creatomate (RenderScript `source`, template-as-code)
//
// Reads creatomate/templates/<layout>.json (Plan 15-01's brand templates),
// substitutes {{PLACEHOLDER}}-style tokens with brief text, POSTs inline via
// the `source` field to /v2/renders (falls back to /v1/renders if /v2 rejects),
// polls until status === "succeeded", downloads the PNG.
// ─────────────────────────────────────────────
function substitutePlaceholders(obj, values) {
  const json = JSON.stringify(obj);
  const replaced = json.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (m, key) => {
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
  if (!apiKey) throw new Error("CREATOMATE_API_KEY not set (Plan 15-01 pending) — skipping Creatomate call");

  let source = loadCreatomateTemplate(layout);
  if (!source) {
    throw new Error(`creatomate/templates/${layout}.json not found (Plan 15-01 pending)`);
  }
  source = substitutePlaceholders(source, { ...values, BACKGROUND_URL: backgroundUrl || "" });

  const renderBody = JSON.stringify({ output_format: "png", width, height, source });
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

  let res = await httpJson("https://api.creatomate.com/v2/renders", { method: "POST", headers, body: renderBody });
  if (res.statusCode === 404) {
    // fallback per plan: some accounts still resolve on /v1
    res = await httpJson("https://api.creatomate.com/v1/renders", { method: "POST", headers, body: renderBody });
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
    const poll = await httpJson(`https://api.creatomate.com/v2/renders/${renderId}`, { headers });
    status = poll.json?.status;
    url = poll.json?.url || url;
  }
  if (status !== "succeeded" || !url) throw new Error(`Creatomate render ${renderId} did not succeed in time`);
  return { imageUrl: url, latencyMs: Date.now() - start, costUsd: 0.02 /* credit-based, approx */, sourceFormat: "png" };
}

// ─────────────────────────────────────────────
// ENGINE 3 — Gamma
//
// POST /v1.0/generations, poll /v1.0/generations/{id} @5s, export PNG (zip),
// unzip via `tar -xf` (Node has no built-in unzip; tar handles zip on Win11).
// ─────────────────────────────────────────────
async function callGamma({ inputText, dimensions, themeId, outDir }) {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) throw new Error("GAMMA_API_KEY not set (Plan 15-02 pending) — skipping Gamma call");

  const body = JSON.stringify({
    inputText,
    format: "social",
    ...(themeId ? { themeId } : {}),
    cardOptions: { dimensions },
    textOptions: { amount: "concise" },
  });
  const headers = { "X-API-KEY": apiKey, "Content-Type": "application/json" };
  const start = Date.now();
  const create = await httpJson("https://api.gamma.app/v1.0/generations", { method: "POST", headers, body });
  if (create.statusCode < 200 || create.statusCode >= 300) {
    throw new Error(`Gamma create ${create.statusCode}: ${create.body.toString("utf8").slice(0, 300)}`);
  }
  const genId = create.json?.generationId || create.json?.id;
  let status = create.json?.status;
  let exportUrl = null;
  while (status !== "completed" && Date.now() - start < 180000) {
    if (status === "failed") throw new Error(`Gamma generation ${genId} failed`);
    await sleep(5000);
    const poll = await httpJson(`https://api.gamma.app/v1.0/generations/${genId}`, { headers });
    status = poll.json?.status;
    exportUrl = poll.json?.exportUrl || poll.json?.pngExportUrl || exportUrl;
  }
  if (status !== "completed" || !exportUrl) throw new Error(`Gamma generation ${genId} did not complete in time`);

  const zipPath = path.join(outDir, `${genId}.zip`);
  await downloadToFile(exportUrl, zipPath);
  execSync(`tar -xf "${zipPath}" -C "${outDir}"`);
  const files = fs.readdirSync(outDir).filter((f) => f.toLowerCase().endsWith(".png"));
  if (!files.length) throw new Error(`Gamma export zip had no PNGs: ${zipPath}`);
  return { localPath: path.join(outDir, files[0]), latencyMs: Date.now() - start, costUsd: 0, sourceFormat: "png" };
}

// ─────────────────────────────────────────────
// ENGINE 4 — Hybrid (EVAL-05): FAL background (Flux 2 Pro) + Creatomate overlay
//
// Stage 1: FAL fal-ai/flux-pro/v1.1 synchronous endpoint (https://fal.run/...) —
// mirrors production's own working "⚡ Flux 2 Pro (FAL.AI)" node exactly (same
// endpoint/params), prompt WITHOUT any text instructions (background only).
// Stage 2: pass the resulting image URL as the background into the Creatomate
// template render (deterministic typographic overlay).
// ─────────────────────────────────────────────
async function callFalFluxBackground(backgroundPrompt, format) {
  const aspect = ASPECT[format].fal;
  const body = JSON.stringify({
    prompt: `${backgroundPrompt} — style: dark background #070A18, purple to magenta gradient accents (#8000A8 to #BA00E0), professional high-quality social media graphic, ultra detailed, 4K`,
    image_size: aspect,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "png", // attempt PNG normalization (Pitfall 5); production's own flux-generate
    // node omits this param — if the vendor ignores it, downloadToFile's magic-byte detection
    // records the actual returned format in run-meta.json rather than trusting this request field.
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

async function callHybrid({ layout, values, backgroundPrompt, format, width, height }) {
  const bg = await callFalFluxBackground(backgroundPrompt, format);
  if (!process.env.CREATOMATE_API_KEY || !loadCreatomateTemplate(layout)) {
    // Stage 2 not runnable yet (15-01 pending) — return stage 1 only, logged as pending-preflight
    return {
      imageUrl: bg.imageUrl,
      latencyMs: bg.latencyMs,
      costUsd: bg.costUsd,
      sourceFormat: "jpeg-or-png-vendor-default",
      stage2Pending: true,
      note: "Stage 2 (Creatomate overlay) pending — creatomate/templates/ or CREATOMATE_API_KEY not yet available (Plan 15-01).",
    };
  }
  const overlay = await callCreatomate({ layout, values, width, height, backgroundUrl: bg.imageUrl });
  return {
    imageUrl: overlay.imageUrl,
    latencyMs: bg.latencyMs + overlay.latencyMs,
    costUsd: bg.costUsd + overlay.costUsd,
    sourceFormat: "png",
    stage2Pending: false,
  };
}

// ─────────────────────────────────────────────
// Layout naming for Creatomate templates (per 15-01's convention)
// ─────────────────────────────────────────────
function layoutForSlide(format, slide) {
  if (format === "single") return "single";
  if (format === "story") return "story";
  if (!slide) return "single";
  return `carousel-${slide.layout}`; // carousel-opening | carousel-middle | carousel-closing
}

// ─────────────────────────────────────────────
// Run orchestration
// ─────────────────────────────────────────────
function timestampDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function renderOneUnit({ engine, brief, format, slide, outDir }) {
  const fields = slide || brief.formats[format];
  if (!fields) return null;
  const { w, h } = ASPECT[format];
  const layout = layoutForSlide(format, slide);
  const values = {
    HEADLINE: fields.headline || "",
    BODY: fields.body || "",
    BADGE: fields.badge || "",
    CTA: fields.cta || "",
  };
  const slug = slide ? `${brief.id}_${format}_slide${slide.slide_num}` : `${brief.id}_${format}`;
  const destFile = path.join(outDir, engine, `${slug}.png`);

  let result;
  if (engine === "ideogram") {
    const r = await callIdeogram(fields.image_prompt, format);
    const dl = await downloadToFile(r.imageUrl, destFile);
    result = { ...r, destFile, sourceFormat: dl.actualFormat };
  } else if (engine === "creatomate") {
    const r = await callCreatomate({ layout, values, width: w, height: h, backgroundUrl: null });
    const dl = await downloadToFile(r.imageUrl, destFile);
    result = { ...r, destFile, sourceFormat: dl.actualFormat };
  } else if (engine === "gamma") {
    const dims = format === "story" ? "9x16" : "1x1";
    const inputText = [fields.badge, fields.headline, fields.body, fields.cta].filter(Boolean).join("\n\n");
    const tmpDir = path.join(outDir, "gamma", "_raw");
    fs.mkdirSync(tmpDir, { recursive: true });
    const r = await callGamma({ inputText, dimensions: dims, themeId: process.env.GAMMA_THEME_ID, outDir: tmpDir });
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(r.localPath, destFile);
    result = { ...r, destFile, sourceFormat: detectImageFormat(fs.readFileSync(destFile)) };
  } else if (engine === "hybrid") {
    const backgroundPrompt = fields.background_prompt;
    if (!backgroundPrompt) {
      return { skipped: true, reason: "no background_prompt for this slide (closing/no-image layout)" };
    }
    const r = await callHybrid({ layout, values, backgroundPrompt, format, width: w, height: h });
    const dl = await downloadToFile(r.imageUrl, destFile);
    result = { ...r, destFile, sourceFormat: dl.actualFormat };
  } else {
    throw new Error(`Unknown engine: ${engine}`);
  }
  return { unit: slug, engine, format, briefId: brief.id, ...result };
}

async function run() {
  const briefs = selectBriefs();
  const formats = isSmoke ? [FORMATS[0] || "single"] : FORMATS;
  const runDir = path.join(__dirname, "..", "eval-output", timestampDir());
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "briefs.json"), JSON.stringify(briefsData, null, 2));

  const results = [];
  const errors = [];

  for (const engine of ENGINES) {
    for (const brief of briefs) {
      for (const format of formats) {
        if (!brief.formats[format]) continue;
        const units = format === "carousel" ? brief.formats.carousel.slides : [null];
        for (const slide of units) {
          const label = slide ? `${brief.id}/${format}/slide${slide.slide_num}` : `${brief.id}/${format}`;
          try {
            console.log(`→ [${engine}] ${label} ...`);
            const r = await renderOneUnit({ engine, brief, format, slide, outDir: runDir });
            if (r?.skipped) {
              console.log(`  skipped: ${r.reason}`);
            } else {
              console.log(`  OK (${r.latencyMs}ms, ~$${r.costUsd ?? 0})`);
              results.push(r);
            }
          } catch (err) {
            console.error(`  FAILED: ${err.message}`);
            errors.push({ engine, briefId: brief.id, format, slide: slide?.slide_num, error: err.message });
          }
        }
      }
    }
  }

  // Also render the diacritics stress set (single format, per entry's formats_to_render)
  for (const engine of ENGINES) {
    for (const stress of briefsData.diacritics_stress) {
      if (isSmoke) break; // smoke stays minimal
      for (const format of stress.formats_to_render || ["single"]) {
        const fakeBrief = { id: stress.id, formats: { [format]: stress } };
        try {
          console.log(`→ [${engine}] ${stress.id}/${format} (diacritics stress) ...`);
          const r = await renderOneUnit({ engine, brief: fakeBrief, format, slide: null, outDir: runDir });
          if (r?.skipped) console.log(`  skipped: ${r.reason}`);
          else {
            console.log(`  OK (${r.latencyMs}ms, ~$${r.costUsd ?? 0})`);
            results.push(r);
          }
        } catch (err) {
          console.error(`  FAILED: ${err.message}`);
          errors.push({ engine, briefId: stress.id, format, error: err.message });
        }
      }
    }
  }

  const runMeta = {
    ranAt: new Date().toISOString(),
    smoke: isSmoke,
    engines: ENGINES,
    formats,
    briefIds: briefs.map((b) => b.id),
    results: results.map((r) => ({
      unit: r.unit,
      engine: r.engine,
      format: r.format,
      briefId: r.briefId,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      sourceFormat: r.sourceFormat,
      stage2Pending: r.stage2Pending || false,
      // forward-slash always — this path lands in run-meta.json AND as an <img src> in the
      // generated gallery HTML; Windows' path.relative() backslashes are not valid in file:// URLs
      file: r.destFile ? path.relative(runDir, r.destFile).split(path.sep).join("/") : null,
    })),
    errors,
  };
  fs.writeFileSync(path.join(runDir, "run-meta.json"), JSON.stringify(runMeta, null, 2));
  console.log(`\nRun complete. ${results.length} renders, ${errors.length} errors.`);
  console.log(`Output: ${runDir}`);

  generateGallery(runDir);
  return runDir;
}

// ─────────────────────────────────────────────
// Gallery generator — vanilla static HTML, blind A/B/C/D reveal toggle, click-to-zoom
// Reusable standalone via --gallery-only <run-dir>
// ─────────────────────────────────────────────
function generateGallery(runDir) {
  const metaPath = path.join(runDir, "run-meta.json");
  if (!fs.existsSync(metaPath)) {
    console.error(`No run-meta.json found in ${runDir} — cannot generate gallery`);
    return;
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const engines = [...new Set(meta.results.map((r) => r.engine))];
  // Deterministic-but-recorded randomized A/B/C/D mapping (seeded by run timestamp)
  const seed = meta.ranAt || String(Date.now());
  let seedNum = 0;
  for (const c of seed) seedNum = (seedNum * 31 + c.charCodeAt(0)) >>> 0;
  function seededShuffle(arr) {
    const a = [...arr];
    let s = seedNum;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) >>> 0;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const shuffled = seededShuffle(engines);
  const labels = ["A", "B", "C", "D", "E", "F"];
  const labelMap = {};
  shuffled.forEach((eng, i) => (labelMap[eng] = labels[i] || `#${i}`));

  // Group rows by brief+format(+slide)
  const groups = {};
  for (const r of meta.results) {
    const key = `${r.briefId}::${r.format}::${r.unit}`;
    if (!groups[key]) groups[key] = { briefId: r.briefId, format: r.format, unit: r.unit, byEngine: {} };
    groups[key].byEngine[r.engine] = r;
  }

  const rowsHtml = Object.values(groups)
    .map((g) => {
      const cells = engines
        .map((eng) => {
          const r = g.byEngine[eng];
          const label = labelMap[eng];
          if (!r) return `<td class="cell empty" data-engine="${eng}"><span class="label">${label}</span><div class="muted">no render</div></td>`;
          return `<td class="cell" data-engine="${eng}">
            <span class="label">${label}</span>
            <img src="${r.file}" loading="lazy" onclick="zoom(this.src)" alt="${g.unit} — ${eng}" />
            <div class="meta">${r.latencyMs ?? "?"}ms · ~$${(r.costUsd ?? 0).toFixed(2)} · ${r.sourceFormat || ""}</div>
          </td>`;
        })
        .join("\n");
      return `<tr><th>${g.unit}<br/><span class="muted">${g.briefId} / ${g.format}</span></th>${cells}</tr>`;
    })
    .join("\n");

  const headerCells = engines.map((eng) => `<th data-engine="${eng}" class="engine-head">${labelMap[eng]}</th>`).join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Eval — Comparación de motores de diseño (Phase 15)</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; background: #070A18; color: #fff; margin: 0; padding: 24px; }
  h1 { color: #BA00E0; }
  .controls { margin-bottom: 16px; }
  button { background: #8000A8; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  button:hover { background: #BA00E0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #1E0C42; padding: 8px; vertical-align: top; text-align: left; }
  th.row-head, tr > th { background: #0E122B; min-width: 160px; }
  .engine-head { text-align: center; font-size: 18px; color: #00E5FF; }
  .cell { text-align: center; width: 220px; }
  .cell img { max-width: 200px; max-height: 200px; cursor: zoom-in; border-radius: 4px; }
  .cell .label { display: block; font-weight: bold; color: #00E5FF; margin-bottom: 4px; }
  .cell.empty .muted { color: #666; font-size: 12px; }
  .meta { font-size: 11px; color: #8FA2FF; margin-top: 4px; }
  #lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; align-items: center; justify-content: center; }
  #lightbox img { max-width: 90%; max-height: 90%; }
  .revealed .engine-head::after { content: attr(data-real); display: block; font-size: 12px; color: #8FA2FF; }
</style>
</head>
<body>
  <h1>Comparación de motores de diseño — Phase 15</h1>
  <p class="muted">Run: ${meta.ranAt} · ${meta.results.length} renders · ${meta.errors.length} errores</p>
  <div class="controls">
    <button onclick="toggleReveal()">Revelar motores</button>
  </div>
  <table id="gallery">
    <thead><tr><th></th>${headerCells}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div id="lightbox" onclick="this.style.display='none'"><img id="lightbox-img" src="" /></div>
  <script>
    const labelMap = ${JSON.stringify(labelMap)};
    let revealed = false;
    function toggleReveal() {
      revealed = !revealed;
      document.querySelectorAll('.engine-head').forEach(th => {
        const eng = th.dataset.engine;
        th.dataset.real = revealed ? eng : '';
      });
      document.getElementById('gallery').classList.toggle('revealed', revealed);
    }
    function zoom(src) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox').style.display = 'flex';
    }
  </script>
</body>
</html>`;
  fs.writeFileSync(path.join(runDir, "index.html"), html);
  console.log(`Gallery: ${path.join(runDir, "index.html")}`);
}

// ─────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────
(async () => {
  try {
    if (galleryOnlyDir) {
      generateGallery(path.resolve(galleryOnlyDir));
      return;
    }
    await run();
  } catch (err) {
    console.error("Harness fatal error:", err);
    process.exit(1);
  }
})();
