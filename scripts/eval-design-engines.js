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
// the `source` field (confirmed live: POSTing RenderScript fields directly
// at the request root — no `source` key — is REJECTED with "The parameter
// template_id, tags, or source must be provided"; `{ output_format, width,
// height, source: { elements } }` is the shape the live API actually
// accepts, verified with a real 202-accepted render during Plan 15-01),
// polls until status === "succeeded", downloads the PNG.
//
// Base URL: confirmed empirically during Plan 15-01 checkpoint resolution
// that this account's working base is /v1 (GET/POST /v2/... 404s; /v1
// returns 200/202). Tries v1 first, falls back to v2 on 404 for forward-
// compatibility, and polls whichever base actually succeeded (the original
// draft always polled /v2/renders/{id} regardless of which base the create
// call used — fixed here too, Rule 1).
// ─────────────────────────────────────────────
const CREATOMATE_BASES = ["https://api.creatomate.com/v1", "https://api.creatomate.com/v2"];

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

  let templateObj = loadCreatomateTemplate(layout);
  if (!templateObj) {
    throw new Error(`creatomate/templates/${layout}.json not found (Plan 15-01 pending)`);
  }
  templateObj = substitutePlaceholders(templateObj, { ...values, BACKGROUND_URL: backgroundUrl || "" });
  // templateObj carries informational metadata keys (_template, _description)
  // that are not valid RenderScript fields — only forward `elements` inside
  // the `source` wrapper; output_format/width/height are set at the request
  // root from the caller's format-derived values (source of truth per format).
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
  return { imageUrl: url, latencyMs: Date.now() - start, costUsd: 0.02 /* credit-based, approx */, sourceFormat: "png" };
}

// ─────────────────────────────────────────────
// ENGINE 3 — Gamma
//
// POST /v1.0/generations, poll /v1.0/generations/{id} @5s, export PNG (zip),
// unzip via bsdtar (Node has no built-in unzip; Windows' own System32\tar.exe is bsdtar
// and handles zip natively — Git-for-Windows' tar.exe on PATH is GNU tar and does NOT,
// confirmed empirically during Plan 15-04 Task 1 preflight: "This does not look like a
// tar archive"). Absolute path forces the correct binary regardless of PATH order.
//
// PREFLIGHT FINDINGS (Plan 15-04 Task 1, live-verified against the real API):
// 1. Base URL is https://public-api.gamma.app (NOT https://api.gamma.app, which 404s —
//    this was a real bug in the wave-1 harness, fixed here).
// 2. `exportAs: "png"` is REQUIRED in the create body — without it, `exportUrl` never
//    appears in the poll response no matter how long you wait (the original code had no
//    exportAs field at all and would have hung/timed out on every single Gamma call).
// 3. `textOptions.amount: "concise"` is not a valid enum value (brief/medium/detailed/
//    extensive) and `textMode` is effectively required — using `textMode: "preserve"`
//    keeps our exact frozen brand copy verbatim (Gamma's AI does not rewrite it) AND
//    costs meaningfully fewer credits (~18/generation) than the default AI-rewrite mode
//    (~40-42/generation), confirmed via live credit deltas during preflight.
// 4. Carousel-to-cards mapping (RESEARCH Open Question 2 / Pitfall 6), answered
//    empirically: ONE generation call with `cardSplit: "inputTextBreaks"` and inputText
//    sections joined by "\n---\n" produces exactly N distinct card PNGs in the export
//    zip, in the same order as the input sections (verified: a 4-section input produced
//    files "1_...png".."4_...png" mapping 1:1, in order, to the 4 input sections). This
//    means Gamma carousels render via ONE batched call per brief (see
//    renderGammaCarouselBatch), not one call per slide like the other 3 engines.
// ─────────────────────────────────────────────
function extractZip(zipPath, outDir) {
  // Windows' bundled bsdtar (System32) supports zip; Git Bash's tar on PATH (GNU tar)
  // does not and fails with "This does not look like a tar archive" — force the correct
  // binary by absolute path on Windows rather than relying on PATH resolution order.
  const tarBin = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  execSync(`"${tarBin}" -xf "${zipPath}" -C "${outDir}"`);
}

async function callGamma({ inputText, dimensions, themeId, outDir, multiCard = false }) {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) throw new Error("GAMMA_API_KEY not set (Plan 15-02 pending) — skipping Gamma call");

  const body = JSON.stringify({
    inputText,
    textMode: "preserve", // never let Gamma's AI rewrite the frozen brand copy — identical input across all 4 engines
    format: "social",
    ...(themeId ? { themeId } : {}),
    cardSplit: "inputTextBreaks", // "\n---\n" boundaries map 1:1 to distinct cards (empirically verified, Task 1 preflight)
    cardOptions: { dimensions },
    exportAs: "png", // REQUIRED — omitting this means exportUrl never appears in the poll response
  });
  const headers = { "X-API-KEY": apiKey, "Content-Type": "application/json" };
  const start = Date.now();
  const create = await httpJson("https://public-api.gamma.app/v1.0/generations", { method: "POST", headers, body });
  if (create.statusCode < 200 || create.statusCode >= 300) {
    throw new Error(`Gamma create ${create.statusCode}: ${create.body.toString("utf8").slice(0, 300)}`);
  }
  const genId = create.json?.generationId || create.json?.id;
  let status = create.json?.status;
  let exportUrl = null;
  let creditsDeducted = null;
  while (status !== "completed" && Date.now() - start < 180000) {
    if (status === "failed") throw new Error(`Gamma generation ${genId} failed`);
    await sleep(5000);
    const poll = await httpJson(`https://public-api.gamma.app/v1.0/generations/${genId}`, { headers });
    status = poll.json?.status;
    exportUrl = poll.json?.exportUrl || poll.json?.pngExportUrl || exportUrl;
    creditsDeducted = poll.json?.credits?.deducted ?? creditsDeducted;
  }
  if (status !== "completed" || !exportUrl) throw new Error(`Gamma generation ${genId} did not complete in time`);

  // Downloaded as ".dl" first — real format is detected by magic bytes, not guessed from
  // the exportUrl's filename. Preflight finding (Task 1): a SINGLE-card generation's
  // exportAs:"png" export returns a bare PNG file directly (no zip wrapper); only
  // MULTI-card generations (cardSplit producing >1 card) return a real .zip of N PNGs.
  // Treating a bare-PNG response as a zip made tar fail with "Unrecognized archive
  // format" — this branch fixes that by checking the actual bytes first.
  const dlPath = path.join(outDir, `${genId}.dl`);
  const dl = await downloadToFile(exportUrl, dlPath);
  let files;
  if (dl.actualFormat === "png") {
    const singlePath = path.join(outDir, `${genId}.png`);
    fs.renameSync(dlPath, singlePath);
    files = [path.basename(singlePath)];
  } else {
    extractZip(dlPath, outDir);
    files = fs
      .readdirSync(outDir)
      .filter((f) => f.toLowerCase().endsWith(".png"))
      // Export filenames are numbered "1_...png", "2_...png", ... in card order — sort
      // numerically (not lexically) so multi-card batches map back to slides correctly.
      .sort((a, b) => {
        const na = parseInt(a.match(/^(\d+)_/)?.[1] ?? "0", 10);
        const nb = parseInt(b.match(/^(\d+)_/)?.[1] ?? "0", 10);
        return na - nb;
      });
  }
  if (!files.length) throw new Error(`Gamma export had no PNGs: ${exportUrl}`);
  // Gamma Pro is a fixed recurring subscription (~216EUR/yr, see 15-02-GAMMA-ACCESS.md),
  // not metered per-render — hard costUsd is 0, but the actual credits consumed are
  // recorded as a note for the decision doc's cost criterion.
  // Deliberately vendor-name-free (not "gamma credits") — this string can end up in the
  // blind gallery's DOM (CSS-hidden pre-reveal, but still present in HTML source); keep
  // it generic so it doesn't independently identify the engine outside the reveal toggle.
  const costNote = creditsDeducted != null ? `${creditsDeducted} credits` : null;
  if (multiCard) {
    return {
      localPaths: files.map((f) => path.join(outDir, f)),
      latencyMs: Date.now() - start,
      costUsd: 0,
      costNote,
      sourceFormat: "png",
    };
  }
  return { localPath: path.join(outDir, files[0]), latencyMs: Date.now() - start, costUsd: 0, costNote, sourceFormat: "png" };
}

// ─────────────────────────────────────────────
// Gamma carousel batching (Task 1 preflight finding — see callGamma's header comment).
// Renders ALL slides of a carousel brief in ONE Gamma generation call (cardSplit:
// inputTextBreaks), then fans the resulting N card PNGs back out to per-slide result
// entries so the gallery/run-meta grouping stays consistent with the other 3 engines
// (which render carousels one slide at a time).
// ─────────────────────────────────────────────
async function renderGammaCarouselBatch({ brief, outDir }) {
  const slides = brief.formats.carousel.slides;
  const cardTexts = slides.map((s) => [s.badge, s.headline, s.body, s.cta].filter(Boolean).join("\n\n"));
  const inputText = cardTexts.join("\n---\n");
  const tmpDir = path.join(outDir, "gamma", `_raw_${brief.id}_carousel`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const r = await callGamma({
    inputText,
    dimensions: "1x1",
    themeId: process.env.GAMMA_THEME_ID,
    outDir: tmpDir,
    multiCard: true,
  });
  const results = [];
  slides.forEach((slide, i) => {
    const slug = `${brief.id}_carousel_slide${slide.slide_num}`;
    const localPath = r.localPaths[i];
    if (!localPath) {
      results.push({
        unit: slug,
        engine: "gamma",
        format: "carousel",
        briefId: brief.id,
        skipped: true,
        reason: `Gamma batch produced ${r.localPaths.length} card(s), expected ${slides.length} — slide ${i + 1} missing. Not silently dropped: recorded as an honest engine limitation.`,
      });
      return;
    }
    const destFile = path.join(outDir, "gamma", `${slug}.png`);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(localPath, destFile);
    results.push({
      unit: slug,
      engine: "gamma",
      format: "carousel",
      briefId: brief.id,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      costNote: r.costNote ? `${r.costNote} (whole ${slides.length}-card batch, not per-slide)` : null,
      sourceFormat: detectImageFormat(fs.readFileSync(destFile)),
      destFile,
      gammaBatch: true,
    });
  });
  return results;
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
// Standalone Creatomate background source (Plan 15-04 Task 1 preflight finding)
//
// Creatomate has zero image-generation capability of its own — the 5 brand templates
// (Plan 15-01) all expect a real photo URL for image-based layouts (single/opening/
// middle/story). EVAL-03 requires Creatomate to be its own distinct candidate (not the
// same pipeline as EVAL-05's hybrid, which is FAL Flux background + Creatomate overlay).
// DECISION (documented, not silent): the standalone "creatomate" candidate uses a
// deterministic, zero-cost, publicly-hotlinkable placeholder photo (Lorem Picsum, seeded
// per render unit) instead of an AI-generated background. This isolates what EVAL-03
// actually needs to test — Creatomate's template/typography/auto-fit/brand-fidelity
// compositing — from AI-image quality (already covered by Ideogram, Gamma, and Hybrid).
// It also keeps Task 1's credit-budget arithmetic intact (zero extra FAL spend).
// carousel-closing.json has no BACKGROUND_URL token at all, so passing one is harmless.
// ─────────────────────────────────────────────
function placeholderBackgroundUrl(slug, w, h) {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/${w}/${h}`;
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
    const bgUrl = placeholderBackgroundUrl(slug, w, h);
    const r = await callCreatomate({ layout, values, width: w, height: h, backgroundUrl: bgUrl });
    const dl = await downloadToFile(r.imageUrl, destFile);
    result = { ...r, destFile, sourceFormat: dl.actualFormat };
  } else if (engine === "gamma") {
    const dims = format === "story" ? "9x16" : "1x1";
    const inputText = [fields.badge, fields.headline, fields.body, fields.cta].filter(Boolean).join("\n\n");
    // Unique per-call raw dir (Rule 1 fix) — a shared "_raw" dir across every sequential
    // Gamma call in the run would accumulate PNGs from prior calls and risk picking a
    // stale file instead of the current one.
    const tmpDir = path.join(outDir, "gamma", `_raw_${slug}`);
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

        // Gamma carousels render via ONE batched generation call, not one call per slide
        // (Task 1 preflight finding — see callGamma/renderGammaCarouselBatch header comments).
        if (engine === "gamma" && format === "carousel" && !isSmoke) {
          try {
            const nSlides = brief.formats.carousel.slides.length;
            console.log(`→ [gamma] ${brief.id}/carousel (batched, ${nSlides} cards in 1 generation) ...`);
            const batchResults = await renderGammaCarouselBatch({ brief, outDir: runDir });
            for (const r of batchResults) {
              if (r.skipped) {
                console.log(`  skipped: ${r.reason}`);
              } else {
                console.log(`  OK ${r.unit} (${r.latencyMs}ms, ${r.costNote || "~$0"})`);
                results.push(r);
              }
            }
          } catch (err) {
            console.error(`  FAILED: ${err.message}`);
            errors.push({ engine, briefId: brief.id, format, error: err.message });
          }
          continue;
        }

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
      costNote: r.costNote || null,
      sourceFormat: r.sourceFormat,
      stage2Pending: r.stage2Pending || false,
      gammaBatch: r.gammaBatch || false,
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
  const reverseLabelMap = Object.fromEntries(Object.entries(labelMap).map(([eng, lbl]) => [lbl, eng]));

  // Blind-safe image copies (Task 3 fix — the original gallery embedded the real engine
  // name directly in every <img src> path, e.g. "ideogram/....png", which leaks via
  // hover/status-bar, "copy image address", or opening the image in a new tab, even
  // though the visible cell label showed only "A"/"B"/"C"/"D". Copy every render into a
  // neutral per-label folder so no pre-reveal URL/DOM attribute references the engine's
  // own name anywhere — only the <script>'s reveal-toggle data (unavoidable for a
  // client-side-only local HTML file) carries the real mapping, matching run-meta.json.
  const blindDir = path.join(runDir, "blind");
  const blindFileCache = {};
  function blindPathFor(r, eng) {
    const key = `${eng}::${r.unit}`;
    if (blindFileCache[key]) return blindFileCache[key];
    const label = labelMap[eng].toLowerCase();
    const destDir = path.join(blindDir, label);
    fs.mkdirSync(destDir, { recursive: true });
    const destFile = path.join(destDir, `${r.unit}.png`);
    const srcFile = path.join(runDir, r.file);
    fs.copyFileSync(srcFile, destFile);
    const rel = `blind/${label}/${r.unit}.png`;
    blindFileCache[key] = rel;
    return rel;
  }

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
          if (!r) return `<td class="cell empty"><span class="label">${label}</span><div class="muted">no render</div></td>`;
          const costLabel = r.costNote ? r.costNote : `~$${(r.costUsd ?? 0).toFixed(2)}`;
          const blindSrc = blindPathFor(r, eng);
          return `<td class="cell">
            <span class="label">${label}</span>
            <img src="${blindSrc}" loading="lazy" onclick="zoom(this.src)" alt="${g.unit} — ${label}" />
            <div class="meta">${r.latencyMs ?? "?"}ms · ${costLabel} · ${r.sourceFormat || ""}</div>
          </td>`;
        })
        .join("\n");
      return `<tr><th>${g.unit}<br/><span class="muted">${g.briefId} / ${g.format}</span></th>${cells}</tr>`;
    })
    .join("\n");

  const headerCells = engines.map((eng) => `<th data-label="${labelMap[eng]}" class="engine-head">${labelMap[eng]}</th>`).join("\n");

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
  /* Hidden until reveal — latency/cost text (e.g. "15 credits" vs "~$0.06") is itself a
     blind-review leak: the currency-vs-credits FORMAT alone could let an attentive
     reviewer infer which column is credit-metered vs dollar-metered, even with no
     vendor name ever printed. Keeping the blind pass purely visual also matches
     CONTEXT.md's intent (visual criteria scored blind; operational criteria — latency,
     cost, integration complexity — are 1x-weighted and meant to be considered from
     run-meta.json's numbers, not mixed into the visual-only first pass). */
  .meta { font-size: 11px; color: #8FA2FF; margin-top: 4px; display: none; }
  .revealed .meta { display: block; }
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
    // Reveal-toggle data lives ONLY here (unavoidable for a client-side-only local HTML
    // file) — no engine name appears in any DOM attribute or <img src> before this runs.
    const reverseLabelMap = ${JSON.stringify(reverseLabelMap)};
    let revealed = false;
    function toggleReveal() {
      revealed = !revealed;
      document.querySelectorAll('.engine-head').forEach(th => {
        const lbl = th.dataset.label;
        th.dataset.real = revealed ? reverseLabelMap[lbl] : '';
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

  // Record the anonymization mapping back into run-meta.json (not just embedded in the
  // HTML's <script>) so it's independently auditable/reproducible — satisfies "A/B/C/D
  // labels derive from the recorded randomized mapping" as a durable artifact, not only
  // as client-side JS state.
  meta.blindMapping = { seed, labelByEngine: labelMap, engineByLabel: reverseLabelMap };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

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
