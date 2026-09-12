# AI Brand Pulse — Audit Specification

| | |
|---|---|
| **Document** | `docs/audit-spec.md` (canonical) |
| **Version** | 0.1 — Milestone 0 (Foundation) |
| **Date** | 12 September 2026 |
| **Status** | Conceptual data model. Specification for Milestone 1 |
| **Companion documents** | `scoring-rubric.md` (what the signals mean), `engineering-rules.md` (how it is built), `tests/README.md` (how it is tested) |

> **Scope.** This document defines the **shape and semantics** of an audit record — conceptually,
> not in any particular programming language. It deliberately does not choose a language, a
> serialisation library, a validation library or a storage engine; see `engineering-rules.md` §9.
> JSON is used for illustration because the fixtures are JSON, not because JSON is the mandated
> internal representation.

---

## 1. The six layers

Everything in this specification exists to keep six things apart that are routinely, and
damagingly, conflated.

```text
   RAW EVIDENCE          what the website actually exposed
        ↓                (observation — no judgement)
   DERIVED SIGNAL        a deterministic interpretation of evidence
        ↓                (rule — no judgement, no LLM)
   SCORE                 a number produced by documented arithmetic
        ↓                (arithmetic — no judgement, no LLM)
   FINDING               a human-readable statement of what the score means
        ↓                (interpretation — traceable to signals)
   RECOMMENDATION        an action proposed because of a finding
        ↓                (advice — traceable to a finding)
   AI INTERPRETATION     LLM-generated explanation, prioritisation and drafting
                         (language — constrained to the layers above)
```

### 1.1 Raw evidence

**What the website actually exposed.** An observation with a source: a URL, a response status, a
header, a DOM extract, a parsed structured-data block, a byte count.

Rules: evidence is **recorded, never inferred**. Every piece carries where it came from and when it
was collected. Evidence is never rewritten to be "cleaner"; normalisation produces a *new* field
alongside the original. If it was not observed, it is not evidence — its absence is recorded as
absence, which is itself a legitimate observation.

*Examples:* `robots.txt` returned HTTP 200 with this body · this page's JSON-LD contains a `Product`
node with `name` and no `offers.price` · no page in the sample contained a link matching a returns
policy.

### 1.2 Derived signal

**A deterministic interpretation of evidence.** The application of one rule from
`scoring-rubric.md` to evidence, producing one of the six states.

Rules: a signal reads **only** the evidence paths its rubric entry declares, applies a rule that is
fully specified in the rubric, and cites the evidence that produced its state. Same evidence in,
same state out — always. **No network. No clock. No LLM.**

*Examples:* `PRD-03` → `not_detected` · `TEC-05` → `pass` · `TEC-15` → `not_evaluated`.

### 1.3 Score

**A number derived from defined rules** — the arithmetic in `scoring-rubric.md` §3 applied to signal
states and weights. Scores are produced by pure computation over signals. Nothing else may write to
this layer. A score without the signal set that produced it is not a score; it is a rumour.

### 1.4 Finding

**A human-readable interpretation of scored evidence.** What the signals mean for this brand, stated
in language a founder can act on.

Rules: every finding names the signals it derives from. A finding may summarise, group and prioritise
signals; it may **not** introduce a fact that no signal established. A finding derived from a
`not_detected` signal uses not-detected language (`scoring-rubric.md` §2), never absolute language.

### 1.5 Recommendation

**An action proposed because of a finding.** Every recommendation names its parent finding. A
recommendation without a finding is an opinion, and opinions are not what the customer is paying for.

### 1.6 AI interpretation

**LLM-generated explanation based only on evidence, signals, scores and findings.** The LLM drafts
language, explains consequences, prioritises and sequences. It **never** determines a state, a score,
a weight or a fact. Its output is labelled as generated and remains distinguishable from measurement
for the life of the record. See `engineering-rules.md` §4.

---

## 2. Top-level structure

```text
Audit
├── metadata              identity, versions, provenance, timing
├── site                  the subject of the audit as declared/normalised
├── crawl                 collection record: what was fetched, how, and what came back
├── technical             Technical SEO evidence + derived signals
├── content               Content & Topical Authority evidence + derived signals
├── entity                Entity & Trust evidence + derived signals
├── product               Product / AI Shopping Readiness evidence + derived signals
├── ai_discoverability    AI Discoverability Readiness evidence + derived signals
├── scores                dimension scores, overall score, coverage, confidence
├── findings              human-readable interpretations, each traced to signals
├── recommendations       proposed actions, each traced to a finding
└── limitations           what this audit did not and could not establish
```

### Pipeline boundaries

```text
metadata + site + crawl + <dimension>.evidence        ← scoring engine INPUT
        ↓  derive signals (deterministic)
<dimension>.signals
        ↓  compute scores (deterministic)
scores                                                 ← scoring engine OUTPUT
        ↓  interpret (human and/or LLM)
findings → recommendations
        ↓  assemble
limitations
```

**Milestone 1 implements exactly the two deterministic arrows** — evidence to signals, signals to
scores. Everything to the left is Milestone 2; everything to the right is Milestone 3+.

---

## 3. Field conventions

| Convention | Rule |
|---|---|
| Naming | `snake_case` throughout the record |
| Timestamps | ISO 8601 with explicit UTC offset |
| URLs | Absolute, normalised (scheme, host lowercased, fragment stripped); the pre-normalisation original is retained wherever it differs |
| Absence | Explicit `null` for "known to be absent". A **missing key** means "not collected" and is a different statement — the two must never be used interchangeably |
| Enums | Closed sets, declared in this document. An unrecognised value is an error, not a passthrough |
| Numbers | Integers for counts and weights; one decimal place for scores |
| Human review | Every field carries an explicit review policy (§7) |

**Required** below means: the record is invalid without it and the scoring engine must reject the
input rather than compute around it. Silently scoring a malformed record is the failure mode this
column exists to prevent.

---

## 4. `metadata`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `audit_id` | string (opaque, non-guessable) | Yes | Generated at creation | No |
| `schema_version` | string (semver) | Yes | Constant | No |
| `rubric_version` | string (semver) | Yes | Constant | No |
| `engine_version` | string | Yes | Build metadata | No |
| `created_at` | timestamp | Yes | Creation time | No |
| `as_of` | timestamp | Yes | Evidence collection time | No — **but scoring must use this, never the system clock** |
| `mode` | enum: `concierge` · `automated` | Yes | Set by the operator | No |
| `operator` | string | Conditional — required when `mode = concierge` | Operator identity | No |
| `audit_type` | enum: `free_audit` · `blueprint` | Yes | Set by the operator | No |
| `locale` | string (BCP 47) | Yes | Collection configuration | No |
| `source_documents` | array of strings | No | Provenance of manual evidence | Yes |
| `notes` | string | No | Operator | Yes |

**Purpose.** Makes every audit reproducible and attributable. `as_of` is the anchor for every
time-relative computation in the rubric — it is what makes freshness scoring deterministic
(`scoring-rubric.md` §3.4).

---

## 5. `site`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `input_url` | string | Yes | Operator/customer input, verbatim | No |
| `normalised_origin` | string | Yes | Derived from `input_url` | No |
| `brand_name` | string | No | Operator-supplied **or** extracted; `source` recorded | Yes |
| `brand_name_source` | enum: `operator` · `organization_schema` · `title` · `not_detected` | Yes | Derived | Yes |
| `segment` | enum: `d2c` · `heritage` · `export` · `other` · `not_stated` | No | Operator | Yes |
| `stated_objectives` | array of strings | No | Operator, from the prospect's own words | Yes |
| `platform_hint` | string \| null | No | Detected from markup signatures | Yes |
| `key_paths` | array of strings | Yes (may be empty) | Operator / derived from site structure | Yes |

**Purpose.** Identifies the subject and carries the small number of human-supplied inputs the rubric
legitimately depends on. `stated_objectives` is the only input permitted to influence AID-08's state,
and it is explicitly a human-supplied fact, not an inference about the brand.

`platform_hint` is recorded for context only. **No signal may branch on it** — a rubric that scores
one platform differently from another is measuring the platform, not the brand.

---

## 6. `crawl`

The collection record. This is the audit's evidentiary base and its honesty depends on it being
complete about its own limits.

### 6.1 `crawl.sample`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `collected_at` | timestamp | Yes | Collector | No |
| `method` | enum: `manual` · `assisted` · `automated` | Yes | Collector | No |
| `page_count` | integer | Yes | Derived | No |
| `max_depth` | integer | Yes | Collector configuration | No |
| `selection_method` | string | Yes | Collector | Yes |
| `render_mode` | enum: `raw_html` · `rendered` · `both` | Yes | Collector | No |
| `truncated` | boolean | Yes | Collector | No |

**Purpose.** Every rendering of the audit states the sample. Without it, a score over 25 pages reads
as a verdict on 4,000 products. `render_mode` gates AID-07 entirely.

### 6.2 `crawl.origin`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `scheme` | enum: `http` · `https` | Yes | Response | No |
| `redirect_chain` | array of `{from, to, status}` | Yes | Response | No |
| `hsts` | boolean \| null | No | Response headers | No |
| `tls_errors` | array of strings | Yes (may be empty) | Collector | No |
| `host_variants` | object: variant → status | No | Collector | No |

### 6.3 `crawl.robots_txt`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `fetched` | boolean | Yes | Collector | No |
| `status_code` | integer \| null | Yes | Response | No |
| `body` | string \| null | Yes | Response | No |
| `rules` | array of `{user_agent, directive, path}` | Yes (may be empty) | Parsed from `body` | No |
| `sitemap_directives` | array of strings | Yes (may be empty) | Parsed from `body` | No |
| `agent_rules` | object: user-agent → `allow` \| `disallow` \| `not_specified` | Yes | Parsed from `body` | No |

`rules` and `agent_rules` are **derived from `body`** and must be reproducible from it. `body` is the
evidence; the parse is a derivation kept alongside it, not a replacement for it.

### 6.4 `crawl.sitemaps[]`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `url` | string | Yes | Collector | No |
| `discovered_via` | enum: `robots_txt` · `conventional_path` · `operator` | Yes | Collector | No |
| `fetched` / `status_code` / `well_formed` | boolean / integer \| null / boolean | Yes | Response | No |
| `url_count` | integer \| null | Yes | Parsed | No |
| `urls` | array of strings | No | Parsed (may be truncated — record `truncated`) | No |

### 6.5 `crawl.pages[]`

One entry per collected page. This is the largest evidence structure and the source for most signals.

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `url` | string | Yes | Collector | No |
| `final_url` | string | Yes | After redirects | No |
| `status_code` | integer | Yes | Response | No |
| `page_type` | enum: `home` · `collection` · `product` · `about` · `contact` · `policy` · `editorial` · `faq` · `search` · `cart` · `account` · `other` | Yes | Derived, **human-correctable** | **Yes** |
| `depth_from_home` | integer \| null | Yes | Derived | No |
| `title` | string \| null | Yes | DOM | No |
| `meta_description` | string \| null | Yes | DOM | No |
| `meta_robots` / `x_robots_tag` | string \| null | Yes | DOM / headers | No |
| `canonical_url` | string \| null | Yes | DOM | No |
| `canonical_count` | integer | Yes | DOM | No |
| `viewport_meta` | string \| null | Yes | DOM | No |
| `headings` | array of `{level, text, order}` | Yes | DOM | No |
| `internal_links` | array of strings | Yes | DOM | No |
| `external_links` | array of strings | Yes | DOM | No |
| `structured_data` | array of `{format, types[], parse_ok, raw}` | Yes | DOM | No |
| `html_bytes` | integer \| null | No | Response | No |
| `raw_html_text_length` | integer \| null | Conditional — required when `render_mode ∈ {raw_html, both}` | Derived | No |
| `rendered_text_length` | integer \| null | Conditional — required when `render_mode ∈ {rendered, both}` | Derived | No |
| `body_text_hash` | string \| null | No | Derived — CON-12 | No |

`page_type` is the one classification in the crawl layer that is **expected** to need human
correction, and it changes which signals apply. It is flagged for review accordingly.

---

## 7. Dimension sections

`technical`, `content`, `entity`, `product` and `ai_discoverability` share one shape:

```text
<dimension>
├── evidence   dimension-specific extracted observations
└── signals[]  derived signal records
```

### 7.1 `<dimension>.evidence`

Dimension-scoped observations, extracted from `crawl` and/or supplied by a concierge operator. Every
evidence path referenced by a signal in `scoring-rubric.md` §5–9 lives here or in `crawl`.

| Property | Rule |
|---|---|
| Type | Object; shape defined per dimension by the evidence schema (Milestone 1) |
| Required | Yes — may be empty, but the key must exist |
| Source | Extraction from `crawl`, or operator entry when `metadata.mode = concierge` |
| Human review | **Yes.** In concierge mode a human may enter evidence directly, provided `collection_method` on the field records that they did |

Illustrative — `product.evidence` (see `fixtures/` for the full worked shape):

```json
{
  "pages": [
    {
      "url": "https://example.test/products/example-item",
      "structured_data_present": true,
      "parse_ok": true,
      "offer": { "price": 12500, "price_currency": "INR", "availability": "InStock" },
      "sku": "EX-1001", "gtin": null, "mpn": null,
      "brand": "Example Brand",
      "variants": [], "has_variant_selector": false,
      "attributes": { "material": "silk", "colour": "red", "dimensions": "5.5m x 1.1m" },
      "aggregate_rating": null, "review_count": 0, "reviews_visible_on_page": false,
      "shipping_details": null, "return_policy": null,
      "breadcrumb_list": true, "category": "Sarees",
      "image_urls": ["https://example.test/i/1.jpg"],
      "images_with_alt": 1,
      "image_in_structured_data": true
    }
  ]
}
```

### 7.2 `<dimension>.signals[]`

One record per signal defined for that dimension in the rubric.

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `id` | string (e.g. `PRD-03`) | Yes | Rubric | No |
| `state` | enum: `pass` · `partial` · `fail` · `not_detected` · `not_applicable` · `not_evaluated` | Yes | Derivation | **Yes — override permitted** |
| `value` | number \| null | Yes | Derived from `state` | No |
| `weight` | integer | Yes | Rubric | No |
| `evidence_refs` | array of evidence paths | Yes | Derivation | No |
| `reason` | string | Yes | Derivation — which rule branch fired | No |
| `overridden` | boolean | Yes | Review | — |
| `original_state` | enum \| null | Conditional — required when `overridden = true` | Review | No |
| `override_reason` | string \| null | Conditional — required when `overridden = true` | Reviewer | Yes |
| `reviewer` | string \| null | Conditional — required when `overridden = true` | Review | No |

**`evidence_refs` is required and must be non-empty for any signal whose state is not
`not_evaluated`.** A signal that cannot say which evidence produced it is unauditable, and an
unauditable signal is exactly the thing this product promises it does not ship.

**Overrides are never silent.** Every override retains `original_state`. The override log is the
highest-value output of the concierge phase: it is the enumerated list of places where the
deterministic rules were wrong, which is the input to rubric calibration
(`scoring-rubric.md` §10.3–10.4).

---

## 8. `scores`

Pure function of `<dimension>.signals[]` and the rubric. Nothing else may write here.

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `rubric_version` | string | Yes | Constant | **No** |
| `dimensions` | object keyed by dimension code | Yes | Computed | **No** |
| `dimensions.<d>.score` | number (0.0–100.0) \| null | Yes | Computed | **No** |
| `dimensions.<d>.weight` | number | Yes | Rubric | No |
| `dimensions.<d>.effective_weight` | number | Yes | After redistribution | No |
| `dimensions.<d>.coverage` | number (0.0–1.0) | Yes | Computed | No |
| `dimensions.<d>.confidence` | enum: `high` · `medium` · `low` · `unscored` | Yes | Computed | No |
| `dimensions.<d>.signal_counts` | object: state → count | Yes | Computed | No |
| `overall` | number (0.0–100.0) \| null | Yes | Computed | **No** |
| `overall_display` | integer \| null | Yes | `round_half_up(overall, 0)` | No |
| `unscored_dimensions` | array of dimension codes | Yes (may be empty) | Computed | No |
| `issuable` | boolean | Yes | `false` when ≥ 2 dimensions unscored | No |

**Scores are never human-editable.** A reviewer who disagrees with a score changes a **signal state**
— with a recorded override — and the score recomputes. This is the single rule that keeps the number
deterministic and defensible; without it, "deterministic scoring" is a claim rather than a property.

---

## 9. `findings[]`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `finding_id` | string | Yes | Generated | No |
| `dimension` | dimension code | Yes | Derived | Yes |
| `signal_ids` | array of signal IDs | Yes — **non-empty** | Derived | Yes |
| `severity` | enum: `critical` · `high` · `medium` · `low` · `informational` | Yes | Rules and/or reviewer | Yes |
| `statement` | string | Yes | Human or LLM draft | Yes |
| `evidence_summary` | string | Yes | From `evidence_refs` | Yes |
| `generated_by` | enum: `rule` · `human` · `llm` | Yes | Pipeline | No |
| `reviewed_by` | string \| null | Conditional — required when `generated_by = llm` in a delivered audit | Reviewer | — |
| `certainty` | enum: `observed` · `not_detected` · `not_evaluated` | Yes | From contributing signals | Yes |

`signal_ids` must be non-empty. **A finding with no signals is a fabrication** — structurally,
not merely stylistically — and the assembly step rejects it.

`certainty` drives the wording rules in `scoring-rubric.md` §2 and must survive into the rendered
output. It is what turns *"you have no returns policy"* into *"not detected in the pages reviewed"*.

---

## 10. `recommendations[]`

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `recommendation_id` | string | Yes | Generated | No |
| `finding_id` | string | Yes — **non-empty** | Link | Yes |
| `action` | string | Yes | Human or LLM draft | Yes |
| `rationale` | string | Yes | Human or LLM draft | Yes |
| `impact` | enum: `high` · `medium` · `low` | Yes | Rules and/or reviewer | Yes |
| `effort` | enum: `high` · `medium` · `low` | Yes | Reviewer | Yes |
| `priority_rank` | integer | Yes | Derived from impact/effort | Yes |
| `horizon` | enum: `quick_win` · `30_day` · `beyond_30_day` | Yes | Reviewer | Yes |
| `generated_by` | enum: `rule` · `human` · `llm` | Yes | Pipeline | No |

`impact` and `effort` are **judgement**, and the record says so by marking them reviewable. They are
not dressed up as measurements.

---

## 11. `limitations`

Not an afterthought. This section is what separates this product from a generated report, and it is
assembled mechanically so it cannot be quietly dropped when it is inconvenient.

| Field | Type | Required | Source | Human review |
|---|---|---|---|---|
| `sample_statement` | string | Yes | Generated from `crawl.sample` | No |
| `unscored_dimensions` | array of `{dimension, reason}` | Yes (may be empty) | From `scores` | No |
| `not_evaluated_signals` | array of `{signal_id, reason}` | Yes (may be empty) | From signals | No |
| `not_detected_statement` | string | Yes | Constant wording | No |
| `no_ranking_claim_statement` | string | Yes | **Constant, mandatory** | No |
| `no_verification_statement` | string | Yes | **Constant, mandatory** | No |
| `collection_caveats` | array of strings | Yes (may be empty) | Collector + operator | Yes |
| `rubric_version_statement` | string | Yes | From `metadata` | No |

Three statements are **mandatory and constant** in every audit of every kind:

1. **No ranking or citation claim** — this audit does not measure Google rankings or AI-system
   citations, and does not claim to (`product-brief.md` §8).
2. **No third-party verification** — declared entity data, credentials and certifications are
   recorded as stated by the site and have not been independently verified
   (`scoring-rubric.md` ENT-07, ENT-10).
3. **Sample, not census** — the audit reflects the pages collected, listed in `crawl.sample`.

A rendering that omits any of the three is not a valid AI Brand Pulse audit.

---

## 12. Human-review policy summary

| Layer | Human may edit? | Recorded how |
|---|---|---|
| `crawl` evidence | **No** — evidence is observation. Errors are re-collected, not edited | — |
| `page_type` classification | Yes | Field-level correction |
| `<dimension>.evidence` (concierge mode) | Yes — entry permitted | `collection_method` on the field |
| Signal `state` | Yes — override permitted | `overridden`, `original_state`, `override_reason`, `reviewer` |
| `scores` | **No — never** | Change a signal; the score recomputes |
| `findings` | Yes | `reviewed_by` |
| `recommendations` | Yes | `reviewed_by` on the parent finding |
| `limitations` (the three mandatory statements) | **No** | — |

---

## 13. Concierge mode

In `mode = concierge`, evidence may be entered by a human instead of extracted by a collector. The
record shape is **identical** — that is the whole point. Twenty hand-produced audits in this shape
are the regression corpus for the engine (`validation-plan.md` §7); twenty in ad-hoc formats are
worth nothing to the build.

Concierge records must still satisfy: every signal has `evidence_refs`; every finding has
`signal_ids`; every recommendation has a `finding_id`; scores are computed, never typed.

---

## 14. Open specification questions

| # | Question | Current default |
|---|---|---|
| AQ-1 | Is the audit record one document or a set of related records? | **One document** for M1 — simplest thing that supports the next milestone. Splitting is a storage decision and storage is not yet chosen |
| AQ-2 | Is the audit record immutable once issued? | Undecided. Recommended: **issued records are immutable**; re-review produces a new version referencing its predecessor |
| AQ-3 | Does the Blueprint extend the audit record or is it a separate artefact? | Recommended: **separate artefact referencing `audit_id`**, so free-audit records stay uniform for calibration |
| AQ-4 | How are multi-locale / multi-currency sites represented? | Undecided. Currently one `locale` per audit, stated in `limitations`. Genuine multi-locale support needs real cases first |
| AQ-5 | Is raw HTML retained, or only extracted evidence? | Undecided — a real trade-off: retention makes re-derivation possible (valuable while rules are unstable), and creates storage and third-party-content-retention obligations. Recommended for the concierge phase: **retain, locally, outside the repository** |
| AQ-6 | Does `evidence_refs` use JSON Pointer, dotted paths, or a custom scheme? | Undecided. Recommend **JSON Pointer** — standardised, unambiguous with array indices, and no bespoke parser to maintain |
