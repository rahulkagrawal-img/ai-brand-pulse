# AI Brand Pulse

**An evidence-backed AI Commerce Visibility diagnostic for Indian D2C, heritage and export ecommerce
brands.**

> Find out how visible and understandable your ecommerce brand is to Google and AI systems — and
> exactly what to fix.

---

## Current status: Concierge MVP validation (pre-SaaS)

This repository is at **Milestone 0 — Foundation**. It currently contains the canonical product and
engineering documentation, the audit data model, and synthetic test fixtures.

**There is no application code yet, and that is deliberate.** The product is in a validation phase:
roughly 50 qualified prospects, ~20 hand-delivered free audits, 3–5 Blueprint sales, and then a
Build / Pivot / Hold decision. Software that only pays off under BUILD waits for that decision.

See `docs/validation-plan.md`.

---

## Documentation

| Document | What it defines |
|---|---|
| [`docs/product-brief.md`](docs/product-brief.md) | What the product is, who it is for, what it is **not**, and the line between the current product and any future SaaS |
| [`docs/validation-plan.md`](docs/validation-plan.md) | The six hypotheses, their thresholds, the measurement system and the decision gate |
| [`docs/scoring-rubric.md`](docs/scoring-rubric.md) | **v1.0** — five dimensions, 44 scored signals, the six signal states, signal types A/B/C and the scoring mathematics |
| [`docs/audit-spec.md`](docs/audit-spec.md) | The audit record: every field, its type, whether it is required, its evidence source and its human-review policy |
| [`docs/engineering-rules.md`](docs/engineering-rules.md) | Development rules, future security requirements, and the decision log |
| [`fixtures/README.md`](fixtures/README.md) | The synthetic evidence fixtures and how to add more |
| [`tests/README.md`](tests/README.md) | How the scoring engine is to be tested |

`AI_Brand_Pulse_Project_Brief.md` in the repository root is the founder's original narrative brief,
preserved as source material. `docs/product-brief.md` is the canonical engineering-facing version.

---

## The core architecture

```text
Website evidence          what the site actually exposed
       ↓
Structured signals        interpretation by rule — 44 scored signals, 6 states
       ↓
Deterministic scoring     documented arithmetic, no LLM
                          (two scores: deterministic, and assessed incl. human review)
       ↓
Category scores           5 dimensions
       ↓
Overall score             weighted 0–100
       ↓
AI interpretation         explanation and prioritisation, evidence-constrained
       ↓
Findings + recommendations
```

| Dimension | Weight |
|---|---:|
| Technical SEO | 20% |
| Content & Topical Authority | 25% |
| Entity & Trust | 20% |
| Product / AI Shopping Readiness | 20% |
| AI Discoverability Readiness | 15% |

---

## The four rules that govern everything here

1. **Evidence before interpretation.** Every finding traces to something observed.
2. **Deterministic scoring.** The same evidence always produces the same score. No LLM touches a
   number.
3. **No hallucinated evidence.** Rankings, AI citations, backlinks, reviews, certifications,
   competitors and company facts are never invented. What cannot be established is recorded as
   `Not detected` — and rendered as *"not detected in the pages reviewed"*, never as a claim about
   the business.
4. **Human in the loop.** The concierge phase keeps human review, and records every override.

---

## Next milestone

**M1 — the deterministic scoring engine:** structured evidence → signals → category scores →
overall score, testable with no internet, no LLM, no database and no authentication.

One decision is open and blocks it: the implementation language and runtime
(`docs/engineering-rules.md` §9, O-1).
