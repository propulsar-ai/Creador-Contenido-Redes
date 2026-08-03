# 16-05 — Offline Auto-Fit Batch Evidence (INTEG-05)

Real GPT-4o output (generated with the production-hardened prompts extracted programmatically
from `n8n/workflow.json`) rendered through the full Hybrid path (FAL Flux 2 Pro background +
Creatomate typographic overlay, closing-slide-correct) and inspected directly (Claude `Read`
tool on every PNG), per 16-05-PLAN.md. All findings below were tuned and re-rendered green
BEFORE any production deploy or live-fire — no real Meta publish was ever at risk.

Tool: `scripts/autofit-batch.js` (new). Usage: `node scripts/autofit-batch.js [--smoke] [--units id1,id2]`.

## Brief set (8 GPT-4o calls -> 16 render units)

| id | format | type | stress focus |
|---|---|---|---|
| single-veterinaria | single | case_study | historical overflow case ("veterinaria s." wrap bug) |
| single-peluqueria | single | educational | ñ/accent-heavy topic + question mark |
| single-precios | single | authority | numbers/percentages/currency |
| single-chat-concept | single | case_study | drives the one-off chat-mockup.json render |
| story-veterinaria | story | case_study | 9:16 safe-zone + busy background |
| story-peluqueria | story | educational | 9:16 + very bright/graphic Flux background |
| carousel-peluqueria | carousel (5 slides) | educational | opening/middle x3/closing, listicle |
| carousel-precios | carousel (4 slides) | authority | opening/middle x2/closing, pregunta-respuesta |

Render units: 4 single + 2 story + 9 carousel slides + 1 chat-mockup = 16.

## Final green renders (evidence paths, gitignored `eval-output/`)

| unit | final render path |
|---|---|
| single-veterinaria | `eval-output/autofit-2026-08-03_1139/single-veterinaria.png` |
| single-peluqueria | `eval-output/autofit-2026-08-03_1139/single-peluqueria.png` |
| single-precios | `eval-output/autofit-2026-08-03_1159/single-precios.png` |
| single-chat-concept | `eval-output/autofit-2026-08-03_1145/single-chat-concept.png` |
| single-chat-concept (chat-mockup) | `eval-output/autofit-2026-08-03_1145/single-chat-concept_chat-mockup.png` |
| story-veterinaria | `eval-output/autofit-2026-08-03_1147/story-veterinaria.png` |
| story-peluqueria | `eval-output/autofit-2026-08-03_1147/story-peluqueria.png` |
| carousel-peluqueria (5 slides) | `eval-output/autofit-2026-08-03_1156/carousel-peluqueria_slide{1..5}_*.png` |
| carousel-precios (4 slides) | `eval-output/autofit-2026-08-03_1158/carousel-precios_slide{1..4}_*.png` |

## Per-render verdict (final green pass)

| unit | overflow/clipping | auto-fit floor | palette coherence | no Flux-legible-text | closing/chat-mockup | verdict |
|---|---|---|---|---|---|---|
| single-veterinaria | none | readable | coherent | clean | n/a | GREEN |
| single-peluqueria | none | readable | coherent | clean | n/a | GREEN |
| single-precios | none | readable | coherent | clean (re-rendered, see Finding 4) | n/a | GREEN |
| single-chat-concept | none | readable | coherent | clean | n/a | GREEN |
| chat-mockup (single-chat-concept) | none | readable | coherent | clean (real castellano bubbles) | legible, 4 bubbles clear | GREEN |
| story-veterinaria | none | readable | coherent | clean | n/a | GREEN |
| story-peluqueria | none | readable | coherent (fixed, see Finding 2) | clean | n/a | GREEN |
| carousel-peluqueria slide1 (opening) | none | readable | coherent | clean | n/a | GREEN |
| carousel-peluqueria slide2 (middle) | none | readable | coherent | clean (fixed, see Findings 3+5) | n/a | GREEN |
| carousel-peluqueria slide3 (middle) | none | readable | coherent | clean | n/a | GREEN |
| carousel-peluqueria slide4 (middle) | none | readable | coherent | clean (fixed, see Finding 5) | n/a | GREEN |
| carousel-peluqueria slide5 (closing) | none | readable | coherent (dark brand gradient, intentionally subtle) | n/a (typographic only) | correct, Creatomate-only | GREEN |
| carousel-precios slide1 (opening) | none | readable | coherent | clean | n/a | GREEN |
| carousel-precios slide2 (middle) | none | readable | coherent | clean (re-rendered, see Finding 4) | n/a | GREEN |
| carousel-precios slide3 (middle) | none | readable | coherent | clean | n/a | GREEN |
| carousel-precios slide4 (closing) | none | readable | coherent | n/a (typographic only) | correct, Creatomate-only | GREEN |

All 16 units GREEN. Closing slides confirmed rendered Creatomate-only in both carousel decks
(`needs_flux=false` logged for both, background_prompt forced `null` by `parse-carousel`'s own
deterministic layout code — verified, not reimplemented, per the zero-drift execution method
below). Numbers/percentages/currency (`30% y 50%`, `$500/mes`, `135.28%`-style figures) all
render correctly via Creatomate's own typography, never via Flux.

## Zero-drift execution method

`scripts/autofit-batch.js` does not hand-copy the GPT-4o prompts or the deterministic
layout/schema logic. It extracts `n8n/workflow.json`'s `openai-text`/`openai-carousel` node
`jsonBody` expressions and `parse-content`/`parse-carousel` node `jsCode` verbatim, and
**executes** them (Node `vm`, with a minimal n8n-shaped sandbox: `$json`, `$input`, `$`) exactly
as n8n would at runtime. Any future prompt/logic edit in `workflow.json` is automatically picked
up by the next batch run — there is no copy to fall out of sync.

## Findings (all fixed, re-rendered green)

**1. [Rule 3 - Blocking] AOAI occasionally returned syntactically invalid JSON (trailing comma),
breaking every downstream parse.**
- Found during: Task 1's first real batch attempt (`single-veterinaria`, smoke run).
- Evidence: raw content dumped by the batch's own `debug-*-raw.txt` mechanism showed a trailing
  comma after the `facebook` object's `caption` field — valid-looking JSON that GPT-4o
  nonetheless occasionally emits with syntax errors, especially on longer captions.
- Fix: added `response_format: { type: 'json_object' }` to both `openai-text` and
  `openai-carousel`'s AOAI request body (Azure OpenAI JSON mode — grammar-constrained decoding,
  guarantees syntactically valid JSON). This is a production reliability hardening, not scoped to
  this batch only — every future live-fire benefits.
- Files: `n8n/workflow.json` (2 lines, one per node).

**2. [Rule 1 - Bug] `story.json`'s headline had no legibility scrim, unlike its own `body`
element — clashed with a busy/bright Flux background.**
- Found during: Task 2 visual inspection of `story-peluqueria.png` (first render) — the
  headline overlapped a bright diagonal neon light streak in the salon background, reducing
  legibility despite the existing `text-band-overlay` gradient.
- Fix: added a `background_color`/padding/`border_radius` scrim to the `headline` element in
  `creatomate/templates/story.json`, mirroring the pattern already proven on `body`.
- Re-rendered: `story-veterinaria` + `story-peluqueria` both green (both headlines now fully
  legible regardless of background busyness).
- Files: `creatomate/templates/story.json`; regenerated the embedded `TEMPLATES` constant in
  `n8n/subworkflow-hybrid-image.json` (template-parity re-verified PASS after this and every
  subsequent template edit — see Self-Check below).

**3. [Rule 1 - Bug] GPT-4o's own hardened system prompt (`openai-carousel`) contained a
"validated production example" that reliably caused Flux to draw legible English text.**
- Found during: Task 2 inspection of `carousel-peluqueria_slide2` — Flux drew a fully legible
  "Missed call" notification banner on a phone screen.
- Root cause: the EJEMPLOS REALES section's middle-slide example was literally
  `"Smartphone screen showing missed call notification banners..."` — GPT-4o reproduced
  near-identical phrasing for a similar topic, and Flux (trained on real notification UI photos)
  drew the literal banner text despite the surrounding "no text overlays" instruction.
- Fix: replaced the example (and the matching `prompts/background-bank.json` `case_study`/
  `carousel-middle` bank entry) with a phrasing that asks for a "soft glowing abstract shape
  only (no readable icons, banners, notification cards, or words of any kind, not even blurry
  ones)".
- Files: `n8n/workflow.json` (`openai-carousel` node), `prompts/background-bank.json`.

**4. [Rule 1 - Bug] Requesting "abstract charts/graphs/dashboards" still produced legible
numeric labels (a distinct instance of the same root cause as Finding 3).**
- Found during: Task 2 inspection of `carousel-precios_slide2` (first render, before Finding 5's
  meta-rule existed) — Flux drew a readable `135.28%`-style figure on a dashboard screen despite
  the prompt saying "abstract colorful graphs and charts... no text overlays".
- Also true of `single-precios`'s first render (office monitor showing a chart-like screen) —
  re-rendered defensively after Finding 5's fix even though its own violation was borderline.
- Fix: same meta-rule as Finding 5 below (charts/dashboards fall under "objects that in real life
  almost always carry printed data").
- Re-rendered: `carousel-precios` (all 4 slides, GPT-4o naturally chose non-screen imagery:
  robotic arm, floating coins) and `single-precios` (abstract wave pattern on screen) both green.

**5. [Rule 1 - Bug, systemic] Object-category pattern: ANY real-world object that almost always
carries printed text (notebooks/planners, loyalty/ID cards, notification screens, charts) gets
legible-ish text drawn by Flux regardless of an explicit "no text"/"no readable text" qualifier
in the same sentence.**
- Found during: Task 2, 3 independent confirmed instances across this batch alone:
  - `carousel-peluqueria_slide2` (round 1): "Missed call" banner (Finding 3).
  - `carousel-peluqueria_slide2` (round 2, after Finding 3's fix): a different background_prompt
    ("handwritten appointment book") produced a fully legible "Appointment" label on a notebook
    — same root cause, different object.
  - `carousel-peluqueria_slide4` (round 2): a "loyalty card with abstract glowing patterns (no
    readable text)" still rendered garbled-but-legible-looking card text ("Loyalty yovalty
    card...") — confirms the qualifier alone is not sufficient once the object category itself
    is named.
- Fix: added an explicit, generalized meta-rule to BOTH `openai-text` and `openai-carousel`
  system prompts (not a growing per-object ban-list): avoid naming ANY object that in real life
  almost always carries printed text (agendas, notebooks with writing, open books, signage,
  forms, receipts, labels, loyalty/business/credit cards, packaging, notification screens) —
  saying "sin texto" next to it is not enough, Flux draws it anyway from its training prior.
  Practical rule given to GPT-4o: if an object always has text in real life, don't name it —
  show it closed/turned away/out of focus, or replace it with hands, facial expressions,
  gestures, lighting, or environment instead. When in doubt, pick the option with no textual
  object at all.
- Re-rendered `carousel-peluqueria` (all 5 slides) a third time: clean (phone shows abstract
  color blobs, chat bubble icon, neon clock — no card, no notebook, no notification banner).
- Files: `n8n/workflow.json` (`openai-text` + `openai-carousel`, one appended sentence each).

**6. [Rule 1 - Bug, blocking] `chat-mockup.json`'s `phone-panel` shape used `border_radius: "6%"`
— Creatomate rejects percentage units on a shape's `border_radius` (only `background_border_radius`
on text elements accepts percentages).**
- Found during: Task 1's first chat-mockup render attempt — Creatomate returned
  `status: "failed"`, `error_message: "phone-panel.border_radius: Expected a number ending with
  px or vw or vh or vmin or vmax"` (captured via a direct polling GET, not just the generic
  "render failed" the batch's own poll loop surfaces).
- Fix: `border_radius: "48px"`; also converted the shape's flat `fill_color` string to the
  `fill_mode: "linear"` + 2-stop same-color array pattern used by every other shape in these
  templates (a bare solid `fill_color` on a `shape` element is not a pattern used/proven
  elsewhere in this codebase).
- Not wired into the n8n router this phase (per its own `_description`) so no template-parity
  re-sync was needed for this specific file.
- Files: `creatomate/templates/chat-mockup.json`.

**7. [Rule 1 - Bug] `substitutePlaceholders`'s regex (`[A-Z_]+`) silently failed to match numbered
placeholders — `chat-mockup.json`'s `{{CHAT_LINE_1}}`..`{{CHAT_LINE_4}}` tokens were never
substituted.**
- Found during: authoring `scripts/autofit-batch.js` (reasoned about before the first real
  chat-mockup render, since the bug is visible by inspection of the regex against the known
  template).
- Fix: widened the regex to `[A-Z0-9_]+` in `scripts/autofit-batch.js`'s own copy only (this
  batch script's copy is the only caller that renders `chat-mockup.json`; the production
  `eval-design-engines.js` and `subworkflow-hybrid-image.json` copies never render this template
  this phase, so they were left untouched to keep this plan's diff scoped).

## Accepted-with-rationale (not fixed)

- **Chat-mockup's `phone-panel` backdrop is visually almost imperceptible against the existing
  `darken-overlay` gradient** (both are near-black/navy at ~90% opacity in that region). Each
  individual chat bubble already carries its own near-opaque `background_color`, so legibility
  is unaffected — confirmed visually on both chat-mockup renders. Not wired into production this
  phase; left as a minor polish note for whenever chat-mockup is promoted to a router-connected
  layout.
- **Carousel/story closing-slide and dark-slide backgrounds render very close to pure black** —
  intentional per the canonical palette (`#070A18`/`#13082B`/`#08031A` are all near-black tones)
  and the closing-slide's own design intent ("abstract dark gradient background... minimalist",
  `scripts/eval-briefs.json`). Confirmed consistent across every closing-slide render in this
  batch; not a rendering defect.

## Spend vs budget

| run | AOAI calls | Flux calls | Flux cost | Creatomate credits |
|---|---|---|---|---|
| smoke attempts (2 failed pre-fix, JSON parse errors, $0 spend) | 2 | 0 | $0.00 | 0 |
| smoke success + full 8-brief batch | 9 | 13 | $0.39 | 15 |
| chat-mockup re-render (border_radius fix, x2) | 2 | 2 | $0.06 | 4 |
| story re-render (headline scrim fix) | 2 | 2 | $0.06 | 2 |
| carousel-peluqueria re-renders (x3, findings 3/5) | 3 | 12 | $0.36 | 15 |
| carousel-precios re-render (finding 4/5) | 1 | 3 | $0.09 | 4 |
| single-precios re-render (finding 4, defensive) | 1 | 1 | $0.03 | 1 |
| **Total (all iterations, including superseded re-renders)** | **19** (excluded from Flux budget — Azure OpenAI allocation) | **33** | **~$0.99** | **41 credits** |

Flux total (~$0.99) is well within the ~$3 phase budget (Phase 14 budget pattern — never
approached, no escalation needed). Creatomate total (41 credits) is well within the 2,000
credits/month Essential plan.

## Verification

- Batch used the production prompts extracted from `n8n/workflow.json` — confirmed by
  construction (the batch executes the literal node expressions/code via `vm`, not a copy).
- Both carousel decks rendered COMPLETE (closing slide present, Creatomate-only,
  `needs_flux=false` logged) in every final green run.
- All 16 units visually inspected by Claude (`Read` tool) with per-render verdicts recorded
  above; chat-mockup validated with real castellano chat lines (accents + punctuation + emoji).
- Template-parity between `creatomate/templates/*.json` and `n8n/subworkflow-hybrid-image.json`'s
  embedded `TEMPLATES` constant re-verified PASS after every template edit (Findings 2 and 6 —
  Finding 6's file isn't embedded so no re-sync was required there).
- `git status` clean of untracked template edits (only the intended files listed in each commit).
