# AI Brand Pulse — Product Brief

| | |
|---|---|
| **Document** | `docs/product-brief.md` (canonical) |
| **Version** | 0.1 — Milestone 0 (Foundation) |
| **Date** | 12 September 2026 |
| **Status** | Concierge MVP validation / pre-SaaS |
| **Source material** | `AI_Brand_Pulse_Project_Brief.md` (repo root), *Concierge MVP Validation Plan*, *Build Plan / Technical Specification* |

> **Relationship to `AI_Brand_Pulse_Project_Brief.md`:** that file is the founder's original
> narrative brief and is preserved unchanged as source material. This document is the canonical
> engineering-facing product brief. Where the two differ, this document is authoritative for
> implementation and the original is authoritative for intent.

---

## 1. Product name

**AI Brand Pulse** — an *AI Commerce Visibility* diagnostic and Blueprint product.

---

## 2. Product promise

> **Find out how visible and understandable your ecommerce brand is to Google and AI systems —
> and exactly what to fix.**

The product converts a vague founder question — *"can customers and AI systems find and understand
my brand?"* — into an evidence-backed diagnosis and a prioritised action plan.

---

## 3. Target customers

### Primary segments

| Segment | Description |
|---|---|
| **Indian D2C brands** | Brands selling directly through their own ecommerce website. |
| **Heritage brands** | Indian brands with cultural, craft, manufacturing, geographic or historical identity that benefits from stronger entity and topical visibility. |
| **Export brands** | Indian brands selling internationally, where search visibility, product interpretation, trust and structured commercial information materially affect discovery. |

### Validation-phase beachhead

The validation plan narrows the *test* population further than the eventual market:
Indian export and D2C **heritage-commerce** brands — handloom and saree labels, handicraft and
home-décor ateliers, carpet exporters, ethnic-wear D2C stores selling to the UK, US and Gulf.

This is a deliberate sampling decision for the Concierge MVP, **not** a permanent narrowing of the
product's addressable market. See `validation-plan.md` §4.

### Qualification filter (validation phase)

A prospect qualifies only if they:

1. Run a live ecommerce store on their own domain (not marketplace-only).
2. Sell Indian heritage / textile / handicraft / home-décor products.
3. Target or aspire to international buyers.
4. Are reachable via a named founder or marketing lead (not a generic inbox).

### Ideal early-customer characteristics

- Functioning ecommerce website with meaningful catalogue depth
- Existing organic-search ambition
- Accessible decision-maker
- Commercial intent sufficient to invest in visibility
- A clear brand / entity story
- Realistic ability to act on recommendations

---

## 4. Primary problem

Conventional SEO reporting answers *rankings, traffic, technical errors, backlinks, keywords*.
AI-driven discovery adds a second, largely unmeasured layer:

- Can machine systems determine **what the brand sells**?
- Are products described with enough **structured** information to be represented in AI shopping surfaces?
- Is the **brand entity** clearly and consistently defined?
- Can important **facts** be extracted reliably?
- Does the site provide **answerable** content?
- Are commercial facts (price, availability, shipping, returns, trust) **machine-readable**?
- Is the site structured so that search and AI systems interpret it **consistently**?

AI Brand Pulse addresses this broader **commerce visibility and answerability** problem.

Most affected brands cannot self-diagnose it: the failure mode is silent. Nothing breaks, nothing
errors — the brand is simply less interpretable than its competitors, and no existing dashboard
tells them so.

---

## 5. Concierge MVP (current product)

The current product is a **human-delivered, tool-assisted audit** run against a fixed, documented
rubric — not software.

| Aspect | Current state |
|---|---|
| Evidence collection | Manual / semi-manual (browser view-source, crawler tooling, structured-data testing tools) |
| Scoring | The rubric in `scoring-rubric.md`, applied by a human against observed evidence |
| Interpretation | LLM-assisted, from supplied evidence only |
| Delivery | Manually produced free audit and paid Blueprint |
| Payment | Payment links (no code, no integration) |
| Human in the loop | **Yes, by design** |

The Concierge phase is **not throwaway work**. It is the research and specification phase for the
eventual software:

| What is done by hand now | What it becomes later |
|---|---|
| The five-part scoring rubric | The deterministic scoring engine |
| The evidence checklist | The crawler + evidence-extraction layer |
| The interpretation prompt | The AI analysis layer |
| The free-report template | The report output |
| The Blueprint template | Automated Blueprint generation |
| Payment links | A verified payment flow |
| Winning message and niche | Positioning and landing-page copy |
| Objections and price findings | Pricing and tier design |

---

## 6. The ₹2,499 Blueprint

### Free AI Brand Pulse Audit — the diagnostic

Purpose: demonstrate the problem credibly and earn the right to sell the Blueprint.

Contains: overall score · five category scores · key weaknesses · concrete evidence · quick wins ·
high-priority opportunities · short 30-day direction · methodology and limitations · Blueprint CTA.

It must be **undeniably useful on its own** and must **not** substitute for the paid implementation
deliverable.

### Paid AI Brand Pulse Blueprint — ₹2,499

Purpose: convert diagnosis into implementation. It is the **primary validation offer** — the thing
someone either pays for or does not.

Contains everything in the free audit, plus: prioritised issues with rationale and evidence ·
recommended fixes · implementation guidance · page-level recommendations · a technical priority
matrix · content architecture and content opportunities · product-page and schema priorities ·
entity/trust strategy · AI-discoverability ("how to become quotable") guidance · AI-shopping and
product-feed recommendations · a 30-day implementation plan · a measurement framework ·
tool recommendations.

**Price is a test variable, not a constant.** The validation plan runs a pricing variant on the
second batch (see `validation-plan.md` §6). ₹2,499 is the baseline being tested, not a settled price.

---

## 7. Future SaaS vision (NOT current scope)

If — and only if — validation passes the decision gate, the product can evolve into an automated
platform:

```text
Customer → website URL → secure intake → crawler / evidence collection →
structured evidence → deterministic scoring → AI interpretation →
free audit → payment → Blueprint → ongoing monitoring → alerts / reports
```

Candidate future capabilities: automated crawling · evidence extraction · AI analysis · customer
accounts · automated Blueprint generation · recurring visibility monitoring · change detection ·
genuinely measured AI-search test protocols · alerts · historical score tracking · consulting lead
qualification · a ₹999/month Monitor tier.

A reference architecture exists in the Build Plan (Cloudflare / Workers / Supabase / queue /
first-party crawler with a rendering-service fallback / deterministic scoring / LLM analysis /
report / payment verification / Blueprint generation / delivery / monitoring).

> **That architecture is a reference, not a mandate.** It predates validation and predates any real
> implementation requirement. It must be revisited — not inherited — once validation data and actual
> requirements exist. See `engineering-rules.md` §9 (Decision log) for what has and has not been decided.

---

## 8. What AI Brand Pulse is NOT

**It is not a rank tracker.** It does not report Google positions.

**It is not an AI-citation monitor.** It does not claim to observe whether a brand appears in
ChatGPT, Gemini, Perplexity, Google AI Overviews or any other AI surface — unless and until a
defined, disclosed measurement source or test protocol is actually connected. Until then, the
product measures **readiness and answerability signals**, and says so.

**It is not a backlink or authority tool.** It does not report third-party link data it has not
obtained from a stated source.

**It is not a generic SEO site auditor.** Technical SEO is 20% of the model, not the whole model.

**It is not an implementation service.** The Blueprint tells a brand what to do; doing it is a
separate (consulting) engagement.

**It is not an AI-written opinion.** No score is produced by a language model. See
`engineering-rules.md` §4.

**It is not a SaaS yet.** No accounts, no payments integration, no crawler, no dashboard.

### The positioning constraint, stated once, plainly

> **Measure what we can actually observe. Never turn a proxy into a claimed ranking measurement.**

This constraint is the product's credibility. Violating it once — a single invented citation, a
single inferred ranking — destroys the only durable advantage the product has over a generic
auto-generated report.

---

## 9. Product positioning

| | |
|---|---|
| **Category** | AI Commerce Visibility diagnostics |
| **For** | Indian D2C, heritage and export ecommerce brands |
| **Who** | need to be discoverable and interpretable by search engines *and* AI discovery systems |
| **We provide** | an evidence-backed visibility diagnosis and a prioritised implementation Blueprint |
| **Unlike** | rank trackers, generic site auditors and "AI visibility" tools that assert unmeasured citations |
| **We** | score only what is observable, show the evidence for every finding, and state explicitly what we could not determine |

**Defensible edge:** the intersection of ecommerce SEO, GEO/AI-commerce readiness, and genuine
domain credibility in Indian heritage-export commerce. Generic auditors compete with replaceable
software; this does not.

**Commercial role:** a productized front door into higher-value ecommerce/SEO/GEO consulting.

```text
Qualified brand → free audit → problem recognition → ₹2,499 Blueprint →
implementation needs → higher-value consulting → ongoing monitoring
```

The product must surface customers with complex implementation needs **without artificially
withholding useful information** from the paid deliverable.

---

## 10. Validation objective

The objective of the current phase is **not revenue and not software**. It is a decision.

> Will qualified ecommerce founders pay ₹2,499 for this specific output, will they be satisfied with
> it, and is the work systematic enough to automate?

Full detail, hypotheses, thresholds and the decision gate live in `validation-plan.md`.
Summary of the gate:

| Outcome | Condition | Consequence |
|---|---|---|
| **BUILD** | Blueprint conversion ≥ 20% **and** mean satisfaction ≥ 8/10 **and** audit time trending down | Build the SaaS, using this phase as its specification |
| **PIVOT** | Conversion 5–20%, or satisfaction 6–8/10 | Change one variable (price, niche, offer, format, scope); run another small batch |
| **HOLD** | Conversion < 5%, or satisfaction < 6/10 | Do not build. Keep AI Brand Pulse as a consulting diagnostic and lead-generation product |

> If the evidence is weak, **do not build a SaaS because the technology is interesting.**

---

## 11. Current phase and future phases

### Current phase — Milestone 0 → 1

| Milestone | Scope | State |
|---|---|---|
| **M0 — Foundation** | Canonical documentation, audit data model, engineering rules, synthetic fixtures | **This task** |
| **M1 — Deterministic audit engine** | Structured evidence schema, signal derivation, scoring rules, overall score, unit tests | Next |

### Later phases (not current scope)

| Milestone | Scope |
|---|---|
| **M2 — Website evidence extraction** | Safe fetching, HTML parsing, technical/content/schema evidence extraction |
| **M3 — AI interpretation** | Evidence-constrained prompt, findings, priorities, recommendations, 30-day roadmap |
| **M4 — Free audit output** | Repeatable, founder-friendly audit document with Blueprint CTA |
| **M5 — Concierge operations** | Prospect / audit / sale / satisfaction / time-per-audit tracking; validation dashboard |
| **M6 — SaaS decision** | Apply the gate to real validation data |

### Explicitly not built in the current phase

Authentication · customer accounts · payment integration (Razorpay) · email delivery ·
automated production crawler · third-party crawl/rendering services · edge deployment ·
hosted database · background queues · monitoring · subscription billing · customer dashboard ·
admin dashboard · production UI · AI API integration.

These belong to later milestones and must be justified by validation evidence, not by anticipation.

---

## 12. Current vs. future — the distinction that governs every decision

| | **Current product (Concierge MVP)** | **Future automated SaaS (unfunded, undecided)** |
|---|---|---|
| Who runs the audit | A human, against a documented rubric | The system |
| Evidence collection | Manual / tool-assisted | Automated crawler |
| Scoring | Deterministic rubric, applied by hand | Same rubric, executed in code |
| Interpretation | LLM-assisted, human-reviewed | LLM, evidence-constrained, spot-checked |
| Delivery | Manual | Automated |
| Payment | Payment link | Verified integration + webhook |
| Accounts | None | Required |
| Monitoring | None | Recurring, with change detection |
| Decided? | **Yes — in progress** | **No — gated on validation** |

The shared component across both columns is the **rubric and the evidence model**. That is why
Milestone 1 builds the scoring engine and nothing else: it is the only asset that is valuable under
BUILD, PIVOT *and* HOLD.

---

## 13. Success criteria

**Commercial** — customers buy the Blueprint; they perceive sufficient value; monitoring shows
recurring appetite; the product generates qualified consulting opportunities.

**Product** — the audit is understandable; the evidence is credible; recommendations are
actionable; scores are consistent and reproducible; the report saves the customer time.

**Operational** — audit production time decreases; evidence collection becomes progressively
automated; human review concentrates on high-value judgement; cost per audit stays commercially
viable.

---

## 14. One-sentence definition

> **AI Brand Pulse is an evidence-backed AI Commerce Visibility diagnostic and Blueprint product
> that helps Indian ecommerce brands understand how discoverable and interpretable they are to
> modern search and AI systems — and what they should fix next.**

---

## 15. Open product questions

Recorded here rather than resolved by assumption. See `engineering-rules.md` §9 for the engineering
equivalent.

| # | Question | Why it matters | Current default |
|---|---|---|---|
| PQ-1 | Is ₹2,499 the price, or the first price tested? | Changes how the Blueprint scope is set | Treated as a **test variable**; second batch runs a variant |
| PQ-2 | Does the free audit have a fixed page budget? | Constrains audit scope and production time | 1–2 pages, per the validation plan |
| PQ-3 | Is the heritage-export niche the beachhead or the market? | Affects rubric weighting and future positioning | Beachhead for validation only |
| PQ-4 | Does the Monitor tier (₹999/mo) get tested in this phase? | H5 measures stated interest, not willingness to pay | Stated interest only; no price test |
| PQ-5 | Who owns the audit if a human and the engine disagree? | Determines whether human override is recorded as an override or a correction | Human may override; the override **must be recorded** (see `audit-spec.md` §7) |
