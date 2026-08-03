# Phase 16 Plan 01: Creatomate Pricing Research + Recommendation

**Researched:** 2026-08-03
**Purpose:** Present a volume-based tier recommendation and the best-available live-verifiable price for the phase-start Creatomate contracting checkpoint (Task 2). No dollar figure below is treated as a final billing commitment — Task 2 requires the user to confirm the exact live price on the logged-in checkout page before any card is charged.

---

## 1. Confirmed Facts (fetched directly from creatomate.com, 2026-08-03)

Fetched both `https://creatomate.com/pricing` and `https://creatomate.com/docs/account/how-does-the-pricing-work` via direct HTTP GET (no JS execution). Findings:

### 1.1 From `creatomate.com/pricing` (mostly client-rendered, but tier structure IS statically present in the page's Next.js static export)

- **Trial:** 50 API credits, no credit card required, full-featured.
- **Credit unit:** "One image is always one credit." (explicit FAQ answer, static text)
- **Three tiers**, each with a Monthly/Annually toggle ("2 months free!" on annual):
  | Tier | Credit options (statically listed) | Storage | Feed rows |
  |---|---|---|---|
  | **Essential** | 2,000 credits/mo | 5 GB | 1,000 |
  | **Growth** | 10,000 / 20,000 / 30,000 / 40,000 credits/mo | 50 GB | 10,000 |
  | **Beyond** | 50,000 / 100,000 / 150,000 / 200,000 credits/mo | 500 GB | 100,000 |
- **The actual `$` amount next to each "/ mo" label is injected client-side by JavaScript** — confirmed empirically: the raw HTML contains the literal string `/ mo` immediately preceded by an empty element (no digits), for all three tiers. This matches the research's Pitfall 5 finding exactly — automation cannot read the live price off this page.
- Essential is explicitly marked "Best for individuals." Growth is marked "Most Popular" and "Best for startups and small teams."

### 1.2 From `creatomate.com/docs/account/how-does-the-pricing-work` (statically pre-rendered MDX — this DOES contain literal dollar figures, unlike the pricing page)

Direct quote from the page's compiled static HTML (verified via `curl`, not JS-rendered, not a third-party aggregator):

> "If you are new to Creatomate and working as an individual user, we recommend starting with the **Essential plan ($54)**. Companies should subscribe to at least the **Growth 10K plan ($129)** or higher..."

This is a **first-party source** (Creatomate's own documentation, statically compiled into the page — `"__N_SSG":true` in the embedded Next.js data), not a third-party aggregator. It independently corroborates the "general web search" $54/mo figure the phase research flagged as MEDIUM confidence, and directly contradicts SaaSworthy's $41/mo figure.

**Caveat:** the docs page does not explicitly label $54 as "monthly" vs "annual" in that sentence — but it's presented as the plan's headline price (the same convention the pricing page uses for its default "Monthly" tab), and it matches the aggregator figure that was itself inferred to be the monthly rate. Confidence: **HIGH but not 100% — still requires the Task 2 live-checkout confirmation** before any card is charged, per the locked decision (no contract on unverified numbers).

---

## 2. Unverified / Third-Party Numbers (explicitly flagged, NOT used for the recommendation)

| Source | Essential | Growth (10K) | Beyond | Confidence |
|---|---|---|---|---|
| SaaSworthy (aggregator) | $41/mo | — | — | LOW — likely reflects annual-billing-equivalent monthly price, not confirmed |
| General web search (aggregator) | $54/mo | $129/mo | — | MEDIUM — now corroborated by creatomate.com's own docs page (§1.2), raising confidence |

The ~30% spread between $41 and $54 is consistent with Creatomate's own advertised "2 months free" annual discount (annual price ÷ 12 ≈ 10/12 × monthly ≈ 83% of monthly — roughly matching $41/$54 ≈ 76%). This supports the theory that $41 = annual-equivalent monthly price and $54 = true monthly price, but this is inference, not confirmation.

---

## 3. Volume Math (Propulsar's real posting volume)

Per `PROJECT.md`, posting is sporadic (not daily). Using a deliberately generous ceiling:

| Item | Volume/month (generous ceiling) | Credits each | Credits/month |
|---|---|---|---|
| Single posts | ~10 | 1 | 10 |
| Carousels (5 slides avg) | ~5 | 5 | 25 |
| Stories | ~5 | 1 | 5 |
| **Subtotal (real posting)** | ~20 posts | — | **~40 credits** |
| Dev/re-fire/smoke-test overhead | — | — | ~50 credits |
| **Total generous monthly ceiling** | | | **~90 credits/month** |

Even doubling every assumption (40 posts/month, worse re-fire rate), Propulsar stays **well under 200 credits/month** — less than 10% of the Essential tier's 2,000 credit/month allocation.

**Conclusion: Essential tier is correct by a wide margin.** There is no volume-based argument for Growth or Beyond; Propulsar's real usage pattern (sporadic social posting, not bulk video generation) doesn't come close to needing 10,000+ credits/month. The only open question is the tier's exact live price vs. the ~$50/month cap.

---

## 4. Recommendation

- **Tier: Essential (2,000 credits/month).** Confirmed adequate by volume math (§3) with an ~20x safety margin.
- **Billing cycle: Monthly**, suggested for flexibility during the 10-real-post Hybrid validation window (CONTEXT.md decision) — if the engine needs to be paused/downgraded after validation, monthly avoids being locked into an annual commitment early. Annual is noted as cheaper (~2 months free, Creatomate's own framing) if the user prefers to commit for the year once satisfied.
- **Price vs. cap:** Best available evidence (creatomate.com's own docs page, §1.2) points to **~$54/month** for Essential — within the ~$50/month cap by a small margin (~$4 over on paper), but this number is NOT a live-checkout confirmation. **Task 2 requires the user to open the logged-in pricing/checkout page and read the exact live number before contracting** — if it's confirmed at or reasonably close to this figure, proceed; if it's meaningfully higher (e.g. the $54 turns out to be annual-equivalent and true monthly is higher), report and let the user decide whether to still contract given the ~10x volume safety margin, or escalate per the plan's over-cap path.

### FAL Flux price spot-check advisory (non-blocking, research Open Question 2)

Production has consistently used **~$0.03/img** as its planning figure for FAL Flux 2 Pro (`flux-pro/v1.1`) throughout Phases 15-16 documentation. Two independent third-party sources instead suggest FAL's official rate is **$0.04-$0.055/megapixel**, which would put a 1080×1080 render (~1.166 MP) at **$0.047-$0.064** — 50-100% higher than the $0.03 planning figure. This does NOT block Phase 16 (the phase's Flux test budget is a separate small ~$3 cap, and Flux is already live in production with real billing history), but it's worth a quick glance at the FAL dashboard's actual per-call cost during Task 2's session, since the account is already logged in.

---

## 5. Contracted Plan Record (filled in after Task 2)

*Pending user confirmation at the Task 2 checkpoint.*

- Exact price paid: _TBD_
- Billing cycle: _TBD_
- Credits/month shown in dashboard: _TBD_
- API key confirmed still active: _TBD_

---

## 6. Env-Var Wiring Evidence (filled in after Task 3)

*Pending Task 3 execution.*
