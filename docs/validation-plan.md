# AI Brand Pulse — Concierge MVP Validation Plan

| | |
|---|---|
| **Document** | `docs/validation-plan.md` (canonical) |
| **Version** | 0.1 — Milestone 0 (Foundation) |
| **Date** | 12 September 2026 |
| **Status** | Active — validation phase |
| **Source material** | *AI Brand Pulse Concierge MVP Validation Plan*, *Project Brief* |

---

## 1. Purpose and ordering rule

This document defines the measurement system for the Concierge MVP.

> **The validation phase comes BEFORE full SaaS development. Not alongside it, not partly overlapping
> it. Before it.**

The only engineering permitted to run in parallel with validation is work that is valuable under
**every** outcome of the decision gate — the evidence model, the deterministic scoring engine, and
their tests. Everything that only pays off under BUILD (crawler, accounts, payments, delivery,
monitoring, dashboards, deployment) waits for the gate.

Rationale: a fully automated SaaS is the most expensive way to discover that people do not want
something. It carries the highest ongoing burden of any option available — support, API churn,
security maintenance, uptime — and front-loads all of it before a single rupee of proven demand.

The concierge model reverses the order: **sell the outcome first, manufacture it by hand.** What is
learned — which findings make founders wince, which objections kill the sale, what the Blueprint must
contain to feel worth ₹2,499 — becomes the specification for the software. The build is not delayed;
its requirements are being written in the field and paid for by early customers.

---

## 2. The single decision this plan produces

At the end of the run, one of three verdicts. **The decision is arithmetic, not opinion.**

| Verdict | Condition | Action |
|---|---|---|
| **BUILD** | H3 ≥ 20% **and** H4 ≥ 8/10 **and** H6 trending down | Write the software, using this test as its specification |
| **PIVOT** | H3 between 5% and 20%, **or** H4 between 6 and 8 | Change **one** variable — price, niche, or Blueprint contents — and run one more small batch. Do not build until a batch clears the BUILD line |
| **HOLD** | H3 < 5%, **or** H4 < 6/10 | Demand is not there at this price. Redeploy the audit as a free lead-magnet for the consulting funnel; shelve the SaaS |

The pass marks are set **before** any results are seen. That is the only thing that makes the test
honest. They are recorded in this file, in version control, with a timestamp.

---

## 3. Hypotheses

Six hypotheses. Each has a pass line, a pivot band and a hold band.

Where a band is defined below as "pass / pivot / hold", only **H3 and H4 are gating** for the overall
verdict; H1, H2, H5 and H6 are **diagnostic** — they explain *why* H3 and H4 came out as they did and
direct the pivot variable. This distinction matters: a failing H1 with a strong H3 means the funnel is
too narrow, not that the product is wrong.

---

### H1 — Audit acceptance

| | |
|---|---|
| **What is being tested** | Does the outreach hook earn a reply? Is the free audit an offer qualified prospects actually want? |
| **Metric** | Accepted audits ÷ qualified prospects contacted |
| **Target** | **≥ 40%** |
| **Gating?** | Diagnostic |
| **How measured** | Tracking sheet. A prospect counts as *contacted* when the first outreach message is sent to a named person. Counts as *accepted* when they explicitly agree to receive an audit. Non-replies count as contacted-and-not-accepted after a single 48-hour follow-up |
| **Pass** | ≥ 40% |
| **Pivot** | 20–40% — the message or the targeting is off; change the hook before blaming the product |
| **Hold** | < 20% — the framing does not land with this segment at all |
| **Known confounds** | Warm-network contacts will convert far above cold ones. Record the channel per prospect; report H1 both overall **and** split warm/cold, or the number is meaningless |

---

### H2 — Problem resonance

| | |
|---|---|
| **What is being tested** | Do the findings name a real problem the founder did not already know they had? |
| **Metric** | % of audit recipients who confirm the audit surfaced something they did not know |
| **Target** | **≥ 60%** |
| **Gating?** | Diagnostic |
| **How measured** | A single explicit question after audit delivery: *"Did this show you anything you didn't already know?"* Recorded as yes / partly / no. Only an unambiguous **yes** counts toward the numerator. Non-responses are excluded from the denominator and the response rate is reported alongside |
| **Pass** | ≥ 60% |
| **Pivot** | 40–60% — the audit is accurate but not surprising; deepen the evidence or sharpen the findings |
| **Hold** | < 40% — the product is telling people what they already know |
| **Known confounds** | Politeness bias. Indian B2B conversation norms make a soft "yes" cheap. Prefer a recorded specific ("which one?") over a bare affirmative; a respondent who cannot name the finding is recorded as *partly* |

---

### H3 — Blueprint conversion ⭐ **decisive**

| | |
|---|---|
| **What is being tested** | Willingness to pay. The single question that justifies or kills the build |
| **Metric** | Blueprint purchases ÷ completed free audits delivered |
| **Target** | **≥ 20%** |
| **Gating?** | **Yes** |
| **How measured** | Payment received (payment-link settlement), matched to the audit record in the tracking sheet. A verbal "yes, send the link" is **not** a conversion. Only settled payment counts |
| **Pass** | ≥ 20% — at ~20 audits, that is 4+ sales |
| **Pivot** | 5–20% — there is a pulse; change one variable and re-run a 10-prospect batch |
| **Hold** | < 5% — at this price, for this segment, the demand is not there |
| **Known confounds** | Batch 2 runs a deliberate pricing variant (§6). Report H3 **per batch and per price point**, never as a single blended number — blending a ₹1,499 batch into a ₹2,499 batch destroys the signal the test exists to produce |

---

### H4 — Blueprint satisfaction ⭐ **gating**

| | |
|---|---|
| **What is being tested** | Is the paid deliverable actually worth the price? |
| **Metric** | Mean customer rating, 1–10 |
| **Target** | **≥ 8/10** |
| **Gating?** | **Yes** |
| **Supporting metrics** | ≥ 50% say they will act on it; ≥ 1 testimonial or referral obtained |
| **How measured** | Direct question after Blueprint delivery: *"On a 1–10, how useful was it?"* Ratings recorded per customer, with the verbatim response |
| **Pass** | Mean ≥ 8 |
| **Pivot** | Mean 6–8 — the deliverable needs work before automating it |
| **Hold** | Mean < 6 — do not automate a deliverable people do not value |
| **Known confounds** | Very small n. With 3–5 buyers, one 4/10 moves the mean by ~1 point. **Always report n and the individual ratings alongside the mean**; never report the mean alone. A mean of 8.0 from 3 ratings is not the same evidence as 8.0 from 20 |

---

### H5 — Monitoring interest

| | |
|---|---|
| **What is being tested** | Is there recurring-revenue appetite — a Monitor subscription in this? |
| **Metric** | % of Blueprint buyers expressing meaningful interest in a ₹999/month Monitor |
| **Target** | **≥ 30%** |
| **Gating?** | Diagnostic |
| **How measured** | Asked as part of the post-delivery feedback message. Recorded as yes / maybe / no with the verbatim response |
| **Pass** | ≥ 30% |
| **Pivot** | 10–30% — recurring value needs to be defined more concretely before it is built |
| **Hold** | < 10% — the monitoring thesis is unsupported; treat the product as one-shot |
| **Known confounds** | **This measures stated interest, not willingness to pay, and must never be reported as the latter.** No money changes hands at this stage. Stated subscription interest routinely overstates purchase by a large factor. If the Monitor is later built, it needs its own paid validation |

---

### H6 — Audit efficiency

| | |
|---|---|
| **What is being tested** | Is the work systematic enough to be worth coding? |
| **Metric** | Time per completed audit, first-to-last trend |
| **Target** | **Clear downward trend — ~40% drop from the first audits to the last** |
| **Gating?** | Diagnostic, but decisive for *how* to build |
| **How measured** | Wall-clock minutes logged per audit, from evidence collection start to delivered audit. Two practice audits on friendly brands set the baseline before the test begins |
| **Pass** | Time falls ~40%, and the remaining time concentrates in judgement rather than data collection |
| **Pivot** | Falls < 20% — the process is not yet systematic; tighten the rubric and checklist before automating |
| **Hold** | Flat or rising — the work is not repeatable; automating it would encode chaos |
| **Known confounds** | Learning-curve effects dominate early. Also record **where** the time goes (collection vs. interpretation vs. writing): a 40% drop concentrated in collection is the strongest possible evidence for building the crawler first, and that breakdown is more useful to the build than the headline number |

---

## 4. Targeting

**Test one niche, not "any ecommerce brand."**

A generic auditor competes with replaceable software. The defensible edge is a specific intersection:
**Indian export and D2C heritage-commerce brands** — Banarasi silk and saree labels, handicraft and
home-décor ateliers, Bhadohi carpet exporters, ethnic-wear D2C stores selling to the UK, US and Gulf.

Narrowing the test does three things at once:

1. **Lifts conversion** — relevance sells.
2. **Sharpens the Blueprint** — specific schema, feed and export-buyer signals can be cited.
3. **Gives the eventual software a wedge market** instead of an ocean.

Qualification filter: see `product-brief.md` §3.

---

## 5. Validation sequence

```text
~50 qualified prospects
        ↓  (H1 — ~40% accept)
~20 delivered free audits
        ↓  (H3 — ~20% convert)
3–5 Blueprint sales
        ↓
BUILD / PIVOT / HOLD
```

### Why 20 audits

Small enough to complete by hand in four weeks; large enough that the conversion signal is real
rather than noise. At 20 audits, the difference between 1 buyer (5%) and 4 buyers (20%) is
unmistakable — and that is exactly the line the build decision turns on.

> **Line up ~50 names before starting** so the funnel never stalls mid-test.

### Statistical honesty

At n=20, a 20% conversion rate has a 95% confidence interval of roughly **6%–44%**. This test cannot
establish the conversion rate precisely and is not intended to. It is designed to **discriminate
between "clearly working" and "clearly not"** at low cost. A result landing in the PIVOT band is the
expected outcome of an underpowered test, not a failure of the test — it means run another batch,
which is exactly what the PIVOT branch says to do.

Record this limitation in any write-up of the results. Do not present a point estimate from 20 audits
as a measured conversion rate.

### Sourcing the 50 names

| Source | How to mine it | Est. yield |
|---|---|---|
| Own network | Peers, past clients, Varanasi/Bhadohi export contacts. Warmest, highest-converting | 10–15 |
| Instagram | Saree / handloom / handicraft D2C brands with a website link in bio and active selling; note the founder's handle | 15–20 |
| Export directories | Textile and carpet exporters with their own D2C site (not just a listing) | 10–15 |
| LinkedIn | Founders / marketing leads of Indian heritage D2C brands | 10–15 |
| Public storefronts | Public ecommerce-platform storefronts in the niche | 8–12 |
| Export Promotion Councils | Member lists (handloom / handicraft / carpet EPCs) — credible and export-minded by definition | 8–10 |

### Tracking

One sheet, used consistently. It is also the first CRM and the source of testimonials.

`Brand · Founder · Channel (warm/cold) · Contact · Status · Price point · Audit time (min) · Status
date · Notes`

Status values: `contacted` → `accepted` → `audit_sent` → `bought` / `declined` / `no_reply`.

> **Data-protection note:** this sheet holds named individuals' contact details. It is personal data.
> Keep it out of this repository, do not commit exports of it, and do not paste prospect contact
> details into prompts or issue trackers. See `engineering-rules.md` §8.

---

## 6. Offer and pricing test

Lead with the free audit; the Blueprint is the paid step. Because the thing being tested *is*
willingness to pay, **price is a variable, not a constant**.

| Batch | Offer | What it tells you |
|---|---|---|
| First ~10 | Free audit → **₹2,499** Blueprint | Baseline conversion at the target price |
| Next ~10 | One variant: either **₹1,499** Blueprint, **or** ₹2,499 Blueprint + 30-min call at **₹4,999** | Price elasticity, and whether a human touch materially lifts perceived value |

**Only one variant. Not both.** Running two variants across 10 audits produces 5 and 5, which
establishes nothing about either.

**The consulting wedge.** The paid-call variant does double duty: it tests the consulting/Monitor
upsell that makes the business valuable long-term. Even a low Blueprint conversion is a win if the
audit reliably produces consulting conversations — the already-proven revenue line.

Payment is taken through **payment links** — no code, no platform fee, instant setup. This also
rehearses the exact payment rail the software would later automate.

---

## 7. Delivery workflow (concierge)

Every audit runs against the **same** five-part rubric the software will use. Consistency here is
what makes the work automatable later — and is the direct measurement of H6.

| Weight | Category | What is inspected by hand |
|---|---|---|
| 20% | Technical SEO | Titles, meta descriptions, heading structure, canonical and robots directives, sitemap, indexability, page depth |
| 25% | Content & Topical Authority | Editorial presence and depth, buyer-intent coverage, product-education content, topical breadth for the niche |
| 20% | Entity & Trust | Organization schema, identity consistency, About/Contact completeness, verifiable external references |
| 20% | Product / AI Shopping Readiness | Product schema completeness — name, brand, SKU, price, currency, availability, attributes; reviews/ratings; shipping and returns signals |
| 15% | AI Discoverability Readiness | FAQ markup, answer-first copy, clear entity signals, structured content a machine can quote. **Readiness only** |

Score each category 0–100 **from observable evidence only**, apply the weight, and sum to an overall
score. The signal-level rules are in `scoring-rubric.md`; the audit record structure is in
`audit-spec.md`.

> **Never claim actual Google rankings or actual ChatGPT / Gemini / Perplexity citations unless they
> have been measured directly. Mark anything unverified as `Not detected`.** This honesty *is* the
> product's credibility.

### Division of labour — measurement vs. interpretation

Evidence is collected and scored **deterministically**. An LLM is then used to *interpret* it —
explain each issue, prioritise fixes, draft the 30-day roadmap.

This is exactly the division the software will encode: deterministic scoring, AI interpretation, zero
fabricated facts. Doing it this way now means the rubric and prompts become the code's logic later,
rather than being reverse-engineered from ad-hoc habits.

### Per-audit record

Every concierge audit must produce a stored evidence record in the shape defined by `audit-spec.md` —
even while it is being produced by hand. Twenty hand-made audits in a consistent structure are the
regression corpus for the scoring engine. Twenty audits in twenty ad-hoc formats are worth nothing to
the build.

---

## 8. Four-week run plan

| Week | Focus | Activities |
|---|---|---|
| **1** | Set up & source | Build the tracking sheet; assemble ~50 qualified names against the filter; finalise the rubric and scorecard template; write the interpretation prompt; create payment links; draft the free-report and Blueprint templates; **run 2 practice audits on friendly brands to calibrate scoring and establish the H6 baseline** |
| **2** | Outreach & first audits | Contact the first ~25 prospects, warm network first; deliver 8–10 free audits; log H1 and H2; make the ₹2,499 offer to this batch |
| **3** | Second batch & price test | Contact the remaining ~25; deliver the next 8–10 audits; run the pricing variant on this batch; deliver Blueprints sold in Week 2; collect H4 ratings and H5 interest |
| **4** | Close, measure, decide | Finish outstanding audits and deliveries; chase feedback and testimonials; tally all six metrics against thresholds; apply the decision gate; **write a one-page verdict: Build / Pivot / Hold, and why** |

---

## 9. Metrics dashboard

Filled in at the end of Week 4 and committed to the repository as the record of the decision.

| Metric | Pass line | Result | n | Notes |
|---|---|---|---|---|
| H1 — Audit accept rate | ≥ 40% | ____ % | ___ | split warm / cold |
| H2 — Problem resonance | ≥ 60% | ____ % | ___ | response rate: ___ |
| H3 — Blueprint conversion | ≥ 20% | ____ % | ___ | **per price point** |
| H4 — Mean Blueprint rating | ≥ 8/10 | ____ /10 | ___ | list individual ratings |
| H5 — Monitor interest | ≥ 30% | ____ % | ___ | stated interest only |
| H6 — Time-per-audit drop | ≥ 40% | ____ % | ___ | breakdown by phase |

---

## 10. Budget

| Item | Cost | Notes |
|---|---|---|
| Payment links | ₹0 fixed | Transaction fee only on actual sales |
| LLM usage | ₹0–1,500 | Interpretation and drafting; minimal at this volume |
| Crawl / audit tooling | ₹0 | Free tiers are sufficient at this scale |
| SEO tooling | ₹0 | Existing access / free trial |
| Time | 30–45 hrs | ~2–2.5 hrs/audit early, < 1 hr by the end — *that drop is H6* |

**Total cash outlay: under ₹5,000.** The downside is capped; the information is decisive.

---

## 11. What this phase hands to the build

If the gate says BUILD, nothing done here is wasted:

| Done by hand | Becomes |
|---|---|
| The five-part scoring rubric | The deterministic scoring engine |
| The evidence checklist | The crawler and extraction layer |
| The interpretation prompt | The AI analysis layer |
| The free-report template | The report output |
| The Blueprint template | Automated Blueprint generation |
| Payment links | The verified payment + webhook flow |
| Winning message and niche | Landing-page copy and positioning |
| Objections and price findings | Pricing and tier design |
| 20 structured evidence records | The scoring engine's regression corpus |

---

## 12. Open validation questions

| # | Question | Current default |
|---|---|---|
| VQ-1 | Do the 2 practice audits count toward the 20? | **No** — they are calibration; excluded from all hypothesis denominators |
| VQ-2 | If a prospect asks for the Blueprint without accepting a free audit first, which denominators do they enter? | Counted in H3 numerator; **excluded** from the H3 denominator and flagged separately, since no audit was delivered |
| VQ-3 | Does a refund count as a conversion? | **No.** H3 counts net settled purchases |
| VQ-4 | What if fewer than 20 audits are completed in four weeks? | Report the actual n and extend, rather than applying the gate to a smaller sample. The gate assumes n ≈ 20 |
| VQ-5 | Is the H4 rating collected blind, or after a relationship has formed? | Currently non-blind and self-collected. Treat it as **generous**; a mean of exactly 8.0 should be read as borderline, not as a pass |
