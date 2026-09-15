# AI Brand Pulse — Scoring Rubric

| | |
|---|---|
| **Document** | `docs/scoring-rubric.md` (canonical) |
| **Version** | **1.0** — implementation-ready, uncalibrated |
| **Supersedes** | v0.1 (12 September 2026). See §20 Changelog |
| **Date** | 12 September 2026 |
| **Status** | Specification for Milestone 1. Signal **weights** remain a product hypothesis to be recalibrated after the ~20 concierge audits; signal **rules** are fixed for v1 |
| **Implements** | The five-dimension model in `product-brief.md` §4 and `validation-plan.md` §7 |

> **Read this first.** This rubric defines *how a score is computed*, not *what a good site looks
> like*.
>
> **v1 contains no numeric thresholds in any scoring rule.** Every scored signal resolves through
> structural facts, exact comparisons, or coverage of an explicitly declared list. Where a graded
> measurement would have required a tuned number that no data yet justifies, the signal was converted
> to a state-based rule, demoted to informational, or deferred — never given an invented threshold.
> There are **no `THRESHOLD-TBD` items remaining in scoring**.

---

## 1. The five dimensions

| Code | Dimension | Weight | Scored signal weight total |
|---|---|---:|---:|
| `technical` | Technical SEO | 20% | 20 |
| `content` | Content & Topical Authority | 25% | 25 |
| `entity` | Entity & Trust | 20% | 20 |
| `product` | Product / AI Shopping Readiness | 20% | 20 |
| `ai_discoverability` | AI Discoverability Readiness | 15% | 15 |
| | **Total** | **100%** | **100** |

```text
Overall = technical × 0.20
        + content × 0.25
        + entity × 0.20
        + product × 0.20
        + ai_discoverability × 0.15
```

Dimension weights are **unchanged from v0.1** and remain a product decision, not an engineering one.
They are not to be tuned to make scores look better. One concern is flagged rather than acted on in
§19.

### 1.1 Weight totals are now aligned to dimension weights

**New in v1.** Each dimension's scored signal weights sum to exactly its dimension percentage. The
consequence is worth stating plainly:

> **One signal weight point = one point of the overall score.** A signal weighted 3 can move the
> overall score by at most 3 points.

In v0.1 the dimension totals were 28/22/22/28/20 against weights of 20/25/20/20/15, so one weight
point was worth 1.59× as much in Content as in Technical. That made cross-dimension weight comparison
meaningless and would have corrupted calibration after the concierge batch. Weights are now directly
comparable everywhere in the rubric.

---

## 2. Signal types

**New in v1.** Every signal carries a type. The type governs whether it may affect the automated
score and how it must be presented.

| Type | Name | Scored? | Requires a human? |
|---|---|---|---|
| **A** | Deterministic | Yes — in both scores | No |
| **B** | Reviewer-assessed | Yes — in the assessed score only | **Yes** |
| **C** | Informational | **No** | No |

### Type A — Deterministic

Computable from structured evidence by a fixed rule, with no subjective interpretation at any stage
— including during evidence extraction. Two independent implementations reading the same evidence
record must return the same state.

A signal qualifies as Type A only if **every evidence field it reads is mechanically extractable**
from markup, headers or response metadata. A field that a person or a model has to *judge* is not
mechanically extractable, whatever it is named.

### Type B — Reviewer-assessed

Requires human judgement or qualitative interpretation. These signals exist because they carry the
highest commercial value in the audit — they are the findings that make a founder recognise a problem
— but they are **not measurements**, and v1 refuses to let them behave like measurements.

Every Type B signal specifies:

| Required | Meaning |
|---|---|
| **Review method** | The exact procedure a reviewer follows, with a declared checklist |
| **Reviewer record** | `reviewer`, `reviewed_at`, `reason` — mandatory on the signal record |
| **Scoring treatment** | Included in the **assessed score** only. In the **deterministic score** it is excluded entirely |
| **Unreviewed default** | `not_evaluated` — never a guess, never a zero |
| **Calibration path** | What evidence would allow it to become Type A |

A Type B signal with no reviewer record is `not_evaluated`. It is never inferred, never defaulted,
and never populated by a language model — see `engineering-rules.md` §4.

### Type C — Informational

Observed and reported, but **not scored**. These are facts worth telling the customer that either do
not bear on machine interpretability, cannot be measured honestly, or are already fully represented
by a scored signal.

Type C signals appear in the audit's observations and may support findings. They contribute **zero**
weight and never enter any denominator.

### Deferred

Defined but not active in v1. Not scored, not reported, listed in §17 with what would activate them.

### Retired

Signal IDs from v0.1 that no longer exist as independent signals. **IDs are permanent and are never
reused** (§18). Listed in §16 with where their content went.

---

## 3. The two scores

**New in v1.** Because Type B signals are judgement, a single number would conceal how much of the
score is judgement. Every audit therefore reports two.

| Score | Computed over | Meaning |
|---|---|---|
| `deterministic` | Type A signals only | What software alone can establish from evidence |
| `assessed` | Type A + Type B signals | What the full concierge audit establishes, including human judgement |

Both are computed by the identical arithmetic in §5 over different signal sets.

**Presentation rules, binding on every rendering:**

1. **Both scores are always shown.** Neither may be reported alone.
2. The headline number is `assessed` when every Type B signal carries a reviewer record; otherwise the
   headline is `deterministic`, and the report states that Type B signals were not reviewed.
3. Every rendering states the **reviewer-dependent weight share** — the proportion of the assessed
   score that comes from Type B signals — per dimension and overall.
4. In `mode = automated` (no reviewer), all Type B signals are `not_evaluated` and only the
   deterministic score exists. The report says so.

This is the mechanism that answers the question v0.1 could not: *how much of this number is
measurement and how much is opinion?*

**Type B weight share in v1** — 16 of 100 points. Because one weight point equals one point of the
overall score (§1.1), the in-dimension weights and the overall contribution are the same numbers:

| Dimension | Type A weight | Type B weight | Type B share of dimension |
|---|---:|---:|---:|
| Technical | 20 | 0 | 0% |
| Content | 16 | 9 | 36% |
| Entity | 16 | 4 | 20% |
| Product | 20 | 0 | 0% |
| AI Discoverability | 12 | 3 | 20% |
| **Overall** | **84** | **16** | **16%** |

Content carries the most judgement, which is correct — content quality is genuinely the least
mechanically measurable thing in the model, and pretending otherwise is what v0.1 did.

---

## 4. Signal states

Six states. The vocabulary is closed — no signal may introduce a seventh.

| State | Meaning | Value | Denominator | Coverage |
|---|---|---:|---|---|
| `pass` | Every evaluated item satisfies the rule | **1.0** | In | Counts |
| `partial` | At least one but not all evaluated items satisfy it | **0.5** | In | Counts |
| `fail` | A violation condition fired, or no evaluated item satisfies a correctness rule | **0.0** | In | Counts |
| `not_detected` | Looked for in the collected evidence; absent | **0.0** | In | Counts |
| `not_applicable` | The rule genuinely does not apply to this site | — | **Excluded** | **Excluded from both numerator and denominator of coverage** |
| `not_evaluated` | Evidence could not be checked, or a Type B signal has no reviewer | — | **Excluded** | **Reduces coverage** |

Every state is used by at least one signal, and no signal declares a state its rules cannot produce
(§21 validation).

### 4.1 `not_detected` — checked and absent

**Meaning:** the evidence was sought in the collected material and was not found.

Scores **0.0 and stays in the denominator**, because undiscoverable and absent are the same thing to
a machine reader. A returns policy a machine cannot find does not help the customer who asked an AI
assistant about returns.

**Rendering rule — binding, not stylistic:**

> ✅ *"Returns information was not detected in the pages reviewed."*
> ❌ *"The brand has no returns policy."*

The second sentence is a **fabricated claim about someone's business**. The site may well have a
returns policy; it was not discoverable in the evidence collected. This rule is enforced structurally:
the `certainty` field on every finding (`audit-spec.md` §9) is derived from the contributing signals'
states, and the rendering layer selects wording from `certainty` — never from an author's discretion.

**A signal may only return `not_detected` if the evidence was actually sought.** See §4.4.

### 4.2 `not_evaluated` — could not be checked

**Meaning:** the audit lacked the evidence or the capability to determine the state. Causes:

- the required evidence field is missing from the record (not collected),
- the collection mode required by the signal was not performed,
- a Type B signal has no reviewer record,
- a prerequisite signal itself resolved to `not_evaluated` or `not_detected`.

**`not_evaluated` must never silently become zero.** It is removed from both the numerator and the
denominator, so it cannot depress a score. Its only effect is to **reduce coverage**, which is
reported (§5.3). An engine that maps `not_evaluated` to 0.0 anywhere is defective, and
`tests/README.md` requires an explicit test per signal for this.

Every dimension additionally reports `unevaluated_weight_share`, so a reader can see how much of the
dimension was not measurable.

### 4.3 `not_applicable` — the rule genuinely does not apply

**Meaning:** the property being measured does not exist for this business — not "we did not find it",
but "there is nothing here for this rule to be about". A site that sells nothing has no product
variants to declare.

Excluded from the numerator, the denominator **and** the coverage calculation, because a rule that
does not apply is not missing evidence.

> **`not_applicable` must never become a way to hide a weakness.** See §4.5.

### 4.4 The "was it sought?" requirement

**New in v1.** In v0.1, a signal could return `not_detected` for a page type the collector never
looked for, which meant a sampling limitation scored as a site failure.

v1 requires the evidence record to carry `crawl.sought[]` — a machine-readable list of the page types
and artefacts the collection actually attempted (see `audit-spec.md` §6.1).

| Condition | State |
|---|---|
| Target in `crawl.sought[]`, not found | `not_detected` |
| Target **not** in `crawl.sought[]` | **`not_evaluated`** |

This applies to every signal whose target is a discoverable page or artefact: TEC-03, CON-05, ENT-03,
ENT-05, ENT-09, AID-03, and the policy-page components of PRD-11 and PRD-12.

### 4.5 The catalogue guard

**New in v1.** In v0.1, a site with no product pages produced `not_applicable` across the entire
Product dimension, which was then excluded and its 20% redistributed — silently deleting the most
commercially important finding an AI Commerce Visibility audit can make.

v1 adds **`PRD-00 — Machine-readable catalogue detected`** (Type C, always evaluated). When it is
false for a site audited as ecommerce:

1. Product signals are `not_applicable` and the dimension is unscored, its weight redistributed —
   the arithmetic is unchanged, because scoring a non-existent catalogue as zero would be equally
   dishonest;
2. **a mandatory `critical` finding is emitted** stating that no machine-readable product catalogue
   was detected in the pages reviewed;
3. `scores.catalogue_detected = false` is recorded and stated in the report headline;
4. the audit may **not** present its overall score without that statement adjacent to it.

The score stays honest and the weakness stays visible. Those are not in tension; v0.1 simply
implemented only the first.

**Milestone 1 scope (resolved in Phase 3 planning).** The guard fires whenever
`catalogue_detected = false`. In Milestone 1 — the evidence→signals→scores engine — the guard produces
only its **deterministic effects**: the Product signals resolve to `not_applicable` with the dimension
unscored and its weight redistributed (effect 1), and `scores.catalogue_detected = false` is recorded
(effect 3). The **mandatory `critical` finding** (effect 2) and the **headline-adjacency rule** (effect
4) are produced by the findings/reporting milestone (M3+), not by the M1 scoring engine — findings and
report assembly live to the right of the scoring boundary (`audit-spec.md` §2). M1 carries the flag and
the scoring effect; it does not emit findings.

---

## 5. Scoring mathematics

### 5.1 Signal → dimension

```text
scored(set)   = { signals in dimension, of the requested type set,
                  with state ∈ {pass, partial, fail, not_detected} }

                 Σ (weight_s × value_s)   for s ∈ scored(set)
dimension_raw =  ─────────────────────────────────────────────
                 Σ (weight_s)             for s ∈ scored(set)

dimension_score = round_half_up(dimension_raw × 100, 1)     # 0.0 – 100.0
```

Computed twice: once with `set = {A}` (deterministic) and once with `set = {A, B}` (assessed).

Signals in `not_applicable` or `not_evaluated` appear in neither numerator nor denominator. The
remaining signals proportionally absorb the excluded weight (**weight redistribution**), which must
be disclosed via coverage (§5.3).

### 5.2 Dimension → overall

```text
overall = round_half_up(
    Σ (dimension_score_d × dimension_weight_d) for d ∈ scored_dimensions, 1
)
```

When a dimension is unscored, its weight is redistributed across the remaining dimensions in
proportion to their weights, and `unscored_dimensions` records the exclusion and its reason.

### 5.3 Coverage and confidence

```text
                Σ (weight_s) for s ∈ scored(set)
coverage_d =    ────────────────────────────────────────────────────────────
                Σ (weight_s) for s in dimension of that type set,
                             excluding signals in state not_applicable
```

| Coverage | Confidence | Handling |
|---|---|---|
| ≥ 0.80 | `high` | Report normally |
| 0.50 – 0.79 | `medium` | Report with a visible coverage note |
| > 0 and < 0.50 | `low` | Report with an explicit low-confidence warning in **every** rendering |
| 0 | `unscored` | Dimension excluded from the overall score, weight redistributed, exclusion stated |

When every signal in a dimension is `not_applicable`, the coverage denominator is zero. Coverage is
then defined as **0** and the dimension is `unscored`; the engine must handle this explicitly rather
than dividing by zero. The Product dimension on a site with no catalogue is the ordinary case of
this, not an edge case (§4.5).

An audit with **two or more unscored dimensions** is not issuable (`scores.issuable = false`). It is
an incomplete evidence collection, and saying so is the correct output.

**Coverage ceilings in v1.** No signal is permanently `not_evaluated`, so every dimension can reach
coverage 1.0 on a complete collection. In v0.1, Content was capped at 0.864 and Technical at 0.893 by
permanently-unscorable `THRESHOLD-TBD` signals — those are now informational or deferred and no
longer sit in any denominator.

### 5.4 Determinism requirements

Given byte-identical evidence, the engine returns byte-identical scores. That requires, inside the
scoring path:

1. **No wall-clock, locale, timezone or random input.** Anything time-relative uses `metadata.as_of`
   from the evidence record, never the system clock.
2. **No network, filesystem, database or LLM access.**
3. **No iteration-order dependence.** Items are sorted by an explicit key (URL, then list index)
   before any grouping or reduction.
4. **Rounding once per defined step**, round-half-away-from-zero — not banker's rounding, whose
   behaviour differs between languages and would make the same rubric score differently in two
   implementations.
5. **Exact arithmetic.** Weights are integers; values come from the closed set {0, 0.5, 1.0}, all
   exactly representable in binary floating point. Implementations must not introduce other
   fractional values.
6. **Fixed rule-evaluation order** — §6.2.

---

## 6. The global aggregation rule

**New in v1.** This single algorithm governs every signal that evaluates more than one item — page,
product, collection, article, or member of a declared list. In v0.1, 18 signals specified no
aggregation at all and 16 used undefined quantifiers ("some", "most", "a minority"); those words do
not appear in any v1 scoring rule.

### 6.1 Definitions

| Term | Definition |
|---|---|
| **Population** | The set of items the signal evaluates. Every signal declares it explicitly |
| **Applicable items** | Items in the population to which the rule can apply |
| **Evaluable items** | Applicable items whose required evidence fields are present in the record |
| **Satisfying items** | Evaluable items meeting the signal's *item satisfies when* condition |
| **Violation** | A condition that makes the signal `fail` outright, regardless of proportion |
| **Zero state** | The state when no evaluable item satisfies: `not_detected` for presence rules, `fail` for correctness rules. Declared per signal |

Let `A` = |applicable|, `E` = |evaluable|, `S` = |satisfying|.

### 6.2 The algorithm — evaluated in this exact order

```text
1. if A == 0                      -> not_applicable
2. if E == 0                      -> not_evaluated
3. if any evaluable item triggers
   a declared violation           -> fail
4. if S == E                      -> pass
5. if S > 0                       -> partial
6. otherwise (S == 0)             -> <zero state>
```

**Step 3 before steps 4–6 is what resolves v0.1's branch collisions.** In v0.1, a site where every
page carried exactly one on-host canonical *and* every canonical pointed at the homepage satisfied
both the `pass` clause and the `fail` clause of TEC-06, and nothing said which won. Violations now
always win, and they are declared per signal rather than buried in prose.

### 6.3 Partial evaluability

When `0 < E < A` — some applicable items could not be evaluated — the signal is **still scored, over
the evaluable items only**, and records `items_applicable` and `items_evaluated` on the signal record.
The shortfall is reported in `limitations`, not silently absorbed.

### 6.4 Declared-list signals

Several signals measure coverage of a fixed list (policies, buyer intents, product attributes,
commercial facts). For these the **population is the declared list**, and each member is an item.
The identical algorithm applies: all members present → `pass`, at least one → `partial`, none →
`not_detected`.

This is how v1 eliminates every arbitrary count from v0.1 — "four or more of five policies",
"three or more attributes", "two or more `sameAs`", "three or more schema types". None of those
integers was justified by data. Coverage of a declared list is non-arbitrary because **the list
itself is the standard**, and the lists are versioned with the rubric (§7).

### 6.5 Single-item signals

Signals whose population is one item (the origin, the `robots.txt` file, the `Organization` node)
use the same algorithm with `A = E = 1`, which reduces to: violation → `fail`, satisfies → `pass`,
otherwise → zero state. No special case is needed.

**Exception — signal-local `partial`.** Some single-item signals declare a legitimate `partial` state
that the count arithmetic above cannot produce. Each defines a **signal-local classification** —
documented in its own definition — that inspects its evidence to distinguish a genuine intermediate
case from `pass` and from the zero state; the `partial` there comes from that per-signal inspection,
not from a proportion of items. TEC-03 (a sitemap retrievable but undeclared or malformed), TEC-13 (a
redirect chain that terminates at the preferred origin over multiple hops) and ENT-07 (external
profiles present in markup but not declared in `Organization.sameAs`) each declare such a `partial`. A
single-item signal produces `partial` only where its own definition declares one — never from the
proportion steps.

---

## 7. Declared lists (versioned with the rubric)

Changing any list is a rubric version bump (§18).

| List | ID | Members |
|---|---|---|
| Trust policies | `L-POLICY` | privacy · terms · returns · shipping · refunds |
| Buyer intents | `L-INTENT` | how_to_choose · sizing_and_fit · care_and_maintenance · authenticity_and_provenance · shipping_and_duties · comparison |
| Attributes in text | `L-ATTR-TEXT` | material · dimensions · technique_or_craft · origin · care |
| Structured attributes | `L-ATTR-STRUCT` | material · colour · size_or_dimensions · weight · pattern_or_technique · origin |
| Extractable facts | `L-FACT` | what_sold · materials · origin · price · delivery_terms · returns_terms · care |
| Organization properties | `L-ORG-PROP` | name · url · logo · description · contactPoint · address |
| Contact channels | `L-CONTACT` | email · phone · postal_address |
| Commercial facts | `L-COMMERCIAL` | price · shipping · returns |
| Semantic relationships | `L-RELATION` | breadcrumbs · entity_links · about_mentions |
| Raw-HTML content checks | `L-RAWHTML` | h1_text · body_text · primary_commercial_fact |
| AI/assistant user agents | `L-AIAGENT` | A versioned list of named AI and assistant crawler user-agent tokens, maintained as rubric data. **The list is data, not judgement**; adding or removing an agent is a rubric version bump |

`L-ORG-PROP` deliberately excludes `sameAs`, which is scored solely by ENT-07. In v0.1 it appeared in
both and was double-counted.

---

## 8. How to read a signal definition

```text
#### ID — Name  ·  Type  ·  Weight
- Measures:            what the signal is a measurement of
- Population:          the evaluation denominator (§6.1)
- Evidence:            the evidence paths it may read — and no others
- Item satisfies when: the per-item condition
- Violation:           conditions that force `fail` (§6.2 step 3)
- Zero state:          `not_detected` (presence) or `fail` (correctness)
- States:              every state this signal can produce
- Limits:              what the signal does NOT establish (mandatory)
```

Type B signals additionally carry **Review method**, **Unreviewed default** and **Calibration path**.
Type C signals carry no weight, no zero state and no states — only what is observed and reported.

`sampled pages` always means the pages present in `crawl.pages`, never the site as a whole.

---

## 9. Technical SEO — 20%

*Can search and AI systems reach, parse and correctly index the site?*

**Scored: 9 signals, 20 weight points, all Type A.** Informational: 5. Deferred: 1.

v1 removed five signals from scoring in this dimension. Four were conventional SEO hygiene with no
demonstrable effect on machine interpretability (TEC-01, TEC-09, TEC-14) or were unscorable by the
rubric's own reasoning (TEC-15); one was permanently unscorable (TEC-08). All are retained as
informational observations — the customer still sees them, they simply no longer move a number that
claims to measure AI commerce visibility.

#### TEC-02 — Crawl directives do not block key paths · **Type A** · Weight **3**
- **Measures:** whether declared crawl directives exclude paths the brand needs indexed by search crawlers.
- **Population:** sampled commercial pages (home, collection, product, about, contact, policy, editorial).
- **Evidence:** `crawl.robots_txt.{rules, agent_rules}`, `crawl.pages[].{url, page_type}`, `site.key_paths`
- **Item satisfies when:** no `Disallow` rule for `User-agent: *` matches the item's path by the standard prefix/wildcard convention.
- **Violation:** `Disallow: /` applies to `User-agent: *`.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** Rule matching follows the common prefix/wildcard convention; real crawler behaviour on conflicting rules varies by vendor. Covers `User-agent: *` only — **agent-specific directives are scored by AID-08**, which v1 weights equally (§10 of this dimension's rationale is in §19.2). Non-commercial paths (cart, account, search) are excluded from the population, so blocking them is correctly invisible here rather than scored as `partial`. `site.key_paths` is **context only** (resolved in Phase 3 planning): it may inform how a finding is phrased, but the population and the items evaluated are the sampled commercial pages, never `key_paths` — an operator-supplied path list must not silently become the scoring denominator.

#### TEC-03 — XML sitemap discoverable · **Type A** · Weight **2**
- **Measures:** whether a sitemap can be found by a machine without guessing.
- **Population:** one item — the site's sitemap declaration.
- **Evidence:** `crawl.sitemaps[]`, `crawl.robots_txt.sitemap_directives`, `crawl.sought[]`
- **Item satisfies when:** at least one sitemap is declared in `robots.txt` **and** is retrievable and well-formed.
- **Violation:** none.
- **Zero state:** `not_detected` — but `not_evaluated` if `sitemap` is absent from `crawl.sought[]` (§4.4).
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Limits:** `partial` applies when a sitemap is retrievable at a conventional location but undeclared, or declared but malformed. This is a **signal-local classification** (resolved in Phase 3 planning, §6.5 exception): as a single-item signal the count arithmetic cannot yield `partial`, so TEC-03 inspects its own evidence to distinguish this intermediate case. Only locations actually requested are covered; a sitemap at an unconventional, undeclared path is indistinguishable from none — which is precisely the discoverability problem being measured.

#### TEC-05 — Sampled pages are indexable · **Type A** · Weight **3**
- **Measures:** whether pages that should be indexed are permitted to be.
- **Population:** sampled commercial pages.
- **Evidence:** `crawl.pages[].{meta_robots, x_robots_tag, page_type, status_code}`
- **Item satisfies when:** neither the meta robots tag nor the `X-Robots-Tag` header contains `noindex`.
- **Violation:** any sampled **product or collection** page carries `noindex`.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** Covers only directives observable in HTML and response headers on sampled pages. Does not cover rendering-time injection or index-management outside the site. **This signal does not establish whether a page is in any index** — only whether it is permitted to be. Pages where `noindex` is conventionally appropriate (search, cart, account, faceted URLs) are not in the population.

#### TEC-06 — Canonical tags present and self-consistent · **Type A** · Weight **2**
- **Measures:** whether the site tells machines which URL is authoritative.
- **Population:** sampled pages.
- **Evidence:** `crawl.pages[].{url, canonical_url, canonical_count}`, `site.normalised_origin`
- **Item satisfies when:** `canonical_count == 1` and `canonical_url` is absolute and on the site's own host.
- **Violation:** any page with `canonical_count > 1`; **or** any canonical resolving off-host; **or** every sampled page declaring the same canonical when `page_count > 1` and that canonical equals the origin root.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Limits:** Cross-domain canonicals may be intentional (syndication); they fire the violation and are reported with evidence attached. **This is a signal where human override is expected** (§14.4). The "all canonicals point at the homepage" violation is the case v0.1 could not resolve deterministically. When a canonical is compared with `site.normalised_origin` for that violation, a **trailing slash is normalised before comparison** (resolved in Phase 3 planning), so `https://brand.test` and `https://brand.test/` are treated as the same origin root; no other normalisation is applied at scoring time (the URL is already normalised per `audit-spec.md` §3).

#### TEC-07 — Title tags present and unique · **Type A** · Weight **2**
- **Measures:** whether every sampled page carries a distinct, non-empty title.
- **Population:** sampled pages.
- **Evidence:** `crawl.pages[].{url, title}`
- **Item satisfies when:** `title` is non-empty after whitespace normalisation **and** no other sampled page has a byte-identical normalised title.
- **Violation:** every sampled page shares one identical normalised title and `page_count > 1`.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Limits:** Exact comparison after whitespace normalisation; near-duplicates are not detected. Uniqueness is assessed over sampled pages only. The violation distinguishes total duplication (every page titled "Home") from partial duplication, which v0.1 scored identically at 50%.

#### TEC-10 — Heading structure · **Type A** · Weight **2**
- **Measures:** whether document structure is expressed semantically.
- **Population:** sampled pages.
- **Evidence:** `crawl.pages[].headings[]` (level, text, order)
- **Item satisfies when:** the page has exactly one `h1` **and** no heading level in document order skips more than one level below its predecessor.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected`
- **Limits:** Structural only. A well-formed heading tree says nothing about whether the content beneath it is useful. The zero state is `not_detected` (headings exist but no sampled page satisfies, or a page has no headings at all and so does not satisfy). **`fail` is unreachable for this signal** and is therefore not declared (resolved in Phase 3 planning): TEC-10 defines no violation, and no new violation or `fail` zero-state was invented to make it reachable.

#### TEC-11 — Internal reachability within the sample · **Type A** · Weight **1**
- **Measures:** whether sampled commercial pages are linked from other sampled pages rather than isolated.
- **Population:** sampled commercial pages other than the homepage.
- **Evidence:** `crawl.pages[].{url, internal_links[], depth_from_home}`, `crawl.sample.page_count`
- **Item satisfies when:** the item has `depth_from_home` within the crawl depth **and** at least one other sampled page links to it.
- **Violation:** none.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** **Renamed and downweighted in v1 (2 → 1).** "Orphan within the sample" is not "orphan on the site", and v0.1's name implied a claim the evidence cannot support. `not_evaluated` when fewer than 3 pages were sampled. Client-side-injected links are invisible unless the evidence includes rendered HTML.

#### TEC-12 — Structured data present and parseable · **Type A** · Weight **3**
- **Measures:** whether the site emits machine-readable structured data at all, and whether it parses.
- **Population:** sampled pages.
- **Evidence:** `crawl.pages[].structured_data[]` (`format`, `types`, `parse_ok`)
- **Item satisfies when:** the page carries at least one structured-data block and every block on it has `parse_ok == true`.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected`
- **Limits:** A *syntactic* check — does it parse, and what types are declared. Whether the declared types are correct or complete is ENT-01/02 and PRD-01/03–09. Parseability is not validation against a vocabulary specification; no schema validator is run. This signal measures site-wide emission and is **distinct** from ENT-01 and PRD-01 — see §15. **`fail` is unreachable for this signal** and is therefore not declared (resolved in Phase 3 planning): TEC-12 defines no violation and its zero state is `not_detected` (a page with a block that fails to parse does not satisfy, so it lowers the proportion toward `partial` or `not_detected` rather than forcing `fail`); no new violation or `fail` zero-state was invented to make it reachable.

#### TEC-13 — HTTPS and host canonicalisation · **Type A** · Weight **2**
- **Measures:** whether the site resolves to one secure, consistent origin.
- **Population:** one item — the origin.
- **Evidence:** `crawl.origin.{scheme, redirect_chain, hsts, tls_errors, host_variants}`
- **Item satisfies when:** HTTPS is served, `tls_errors` is empty, and each declared host variant returns a redirect to the single preferred origin.
- **Violation:** HTTP served with no redirect to HTTPS; **or** `tls_errors` non-empty; **or** two or more host variants return 200.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** Certificate validity is recorded as observed at collection time and is not re-verified at scoring time. `partial` covers multi-hop redirects that do terminate at the preferred origin. This is a **signal-local classification** (resolved in Phase 3 planning, §6.5 exception): as a single-item signal the count arithmetic cannot yield `partial`, so TEC-13 inspects its redirect chain to distinguish this intermediate case from a clean single-hop `pass`.

### Technical — informational (Type C, not scored)

| ID | Observation | Why not scored |
|---|---|---|
| **TEC-01** | Whether `robots.txt` exists and is retrievable | Its absence means "allow all" and is harmless. In v0.1 a site scored a point for possessing a file that did nothing. It remains an evidence precondition for TEC-02 and AID-08 |
| **TEC-08** | Title length distribution across sampled pages | No length rule is defensible across Devanagari and Latin titles without measurement, and pixel truncation varies by surface. v0.1 held it permanently `not_evaluated` at weight 1 — weight-bearing decoration |
| **TEC-09** | Meta description presence and uniqueness | Conventional SEO hygiene with negligible effect on machine interpretability. Reported because customers expect it |
| **TEC-14** | Viewport meta declaration | A declared tag is a necessary but wholly insufficient condition for mobile usability, and the rubric forbids reporting it as mobile-friendliness. Scoring it measured nothing |
| **TEC-15** | Page weight, resource counts, render-blocking counts | Real performance is field data about real users on real devices. It cannot be derived from HTML, and a synthetic number collected once from one location is not it. Reporting a fabricated performance grade would breach `product-brief.md` §8 exactly as surely as inventing a ranking |

**Deferred:** TEC-04 (sitemap coverage of key page types) — see §17.

---

## 10. Content & Topical Authority — 25%

*Does the site contain enough substantive, related content for a machine to understand what this
brand is about and to answer buyers' questions from it?*

**Scored: 8 signals, 25 weight points — 6 Type A (16 pts), 2 Type B (9 pts).** Informational: 2.
Deferred: 2.

This is the highest-weighted dimension and it carries the most judgement, at 36% Type B. That is the
honest position: content quality is genuinely the least mechanically measurable property in the model,
and v0.1 concealed this by expressing judgement as evidence fields with objective-sounding names.

#### CON-01 — Category and collection structure · **Type A** · Weight **2**
- **Measures:** whether the catalogue is organised into machine-visible categories.
- **Population:** sampled collection pages.
- **Evidence:** `crawl.pages[].page_type`, `content.collections[].{url, in_primary_navigation}`
- **Item satisfies when:** the collection page is linked from the primary navigation element in the markup.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** `in_primary_navigation` is read from the markup's navigation landmark; mega-menus rendered client-side are invisible without rendered evidence. `not_applicable` when the site has no catalogue (§4.5). v0.1's "two or more collections" count is gone — the number two was arbitrary.

#### CON-02 — Collection pages carry body content · **Type A** · Weight **2**
- **Measures:** whether collection pages explain the category, or are bare product grids.
- **Population:** sampled collection pages.
- **Evidence:** `content.collections[].{url, body_text_present}`
- **Item satisfies when:** the page contains a text block outside the product-listing container.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** **Reformulated in v1** from a `THRESHOLD-TBD` word-count band to a structural DOM fact, which is mechanically checkable and needs no invented number. v0.1's "non-boilerplate" qualifier is removed — it was judgement. Word counts are reported informationally. Presence of prose is not quality of prose.

#### CON-03 — Product descriptions carry text · **Type A** · Weight **4**
- **Measures:** whether product pages carry descriptive text a machine can extract facts from, beyond a title and a price.
- **Population:** sampled product pages.
- **Evidence:** `content.products[].{url, description_text_present}`
- **Item satisfies when:** a non-empty text block is present in the product description region.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** **Reformulated in v1** from a `THRESHOLD-TBD` word-count band to presence. Word count is a poor proxy for substance — for heritage products a 60-word description naming weave, region, fibre and care is more machine-useful than 400 words of atmosphere, which is why no band was invented. **What the text actually contains is CON-04**, and where the two disagree, CON-04 is the more meaningful reading. Word counts are reported informationally.

#### CON-04 — Product attribute narrative · **Type B** · Weight **4**
- **Measures:** whether product text states the attributes a buyer and a machine need — material, dimensions, craft technique, origin, care.
- **Population:** `L-ATTR-TEXT` (5 members), assessed across sampled product pages.
- **Evidence:** `content.products[].attributes_in_text[]` (reviewer-populated)
- **Item satisfies when:** the reviewer records that attribute category as stated in extractable text on at least one sampled product page.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable` · `not_evaluated`
- **Review method:** the reviewer reads each sampled product page's description text and marks each of the five `L-ATTR-TEXT` categories as *stated in text*, *present only in imagery*, or *absent*. Only *stated in text* counts as satisfying. The reviewer records `reviewer`, `reviewed_at` and a one-line `reason` naming the pages inspected.
- **Unreviewed default:** `not_evaluated`.
- **Calibration path:** after the concierge batch, compare reviewer markings against a fixed keyword lexicon per attribute category. If lexicon matching reproduces reviewer judgement reliably, this becomes Type A with the lexicon versioned as a declared list.
- **Limits:** Attributes present only in images are correctly counted as absent — that is the finding, not an extraction error. **Retained as Type B rather than deleted because it is one of the most commercially resonant observations the audit makes for heritage brands**, where provenance and craft are the product. It overlaps PRD-09 by design: CON-04 asks whether a human reader is told, PRD-09 whether a machine is (§15).

#### CON-05 — Informational content hub · **Type A** · Weight **3**
- **Measures:** whether the site has any editorial or informational section.
- **Population:** one item — the site.
- **Evidence:** `content.editorial.{hub_present, hub_url}`, `crawl.sought[]`
- **Item satisfies when:** a blog, journal, guides or resources section is discoverable.
- **Violation:** none.
- **Zero state:** `not_detected` — `not_evaluated` if `editorial` is absent from `crawl.sought[]`.
- **States:** `pass` · `not_detected` · `not_evaluated`
- **Limits:** Binary presence only. Depth and volume are CON-06 (informational) and the deferred CON-08/09. Weight raised 2 → 3 in v1 to absorb part of the weight released by demoting CON-06 and CON-10.

#### CON-07 — Buyer-intent coverage · **Type B** · Weight **5**
- **Measures:** whether content answers the questions buyers ask before purchasing.
- **Population:** `L-INTENT` (6 members).
- **Evidence:** `content.intent_coverage[]` (reviewer-populated: intent → pages)
- **Item satisfies when:** the reviewer maps at least one sampled page to that intent.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Review method:** the reviewer examines sampled editorial and collection pages and assigns each to zero or more `L-INTENT` categories, recording the page URL against each intent. A page may be assigned to more than one intent. The reviewer records `reviewer`, `reviewed_at` and `reason`.
- **Unreviewed default:** `not_evaluated`.
- **Calibration path:** after the concierge batch, derive URL-slug and title-pattern rules per intent from the reviewer's assignments. If patterns reproduce the assignments reliably, this becomes Type A with the patterns as a declared list.
- **Limits:** **The heaviest single signal in the rubric, and it is judgement — which is exactly why v1 makes that visible rather than hiding it behind an evidence field.** Intent assignment cannot currently be made deterministic; v0.1 called it deterministic anyway. Retained at high weight because it is the finding most likely to produce H2 problem resonance (`validation-plan.md` §3). The taxonomy is export-and-heritage specific and versioned with the rubric.

#### CON-11 — Internal content relationships · **Type A** · Weight **3**
- **Measures:** whether editorial and commercial content link to each other.
- **Population:** two items, one per link direction — editorial→commercial and commercial→editorial.
- **Evidence:** *editorial → commercial:* `content.editorial.articles[].internal_links[]` (matched against `content.products[].url` / `content.collections[].url`) and `content.products[].inbound_editorial_links`. *commercial → editorial:* `crawl.pages[].{page_type, internal_links[]}` (matched against `content.editorial.{hub_url, articles[].url}`). Each direction is measured from its own evidence; no field is renamed or reinterpreted.
- **Item satisfies when:** at least one sampled editorial page links to a product or collection page **and** at least one sampled commercial page links to editorial content.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated` · `not_applicable`
- **Limits:** `partial` when links run one way only. `not_applicable` when CON-05 is `not_detected` — there is no editorial content to relate. Link *relevance* is not assessed: a care guide linking to an unrelated product counts the same as a well-targeted link. Weight raised 2 → 3 in v1.

#### CON-12 — Thin and duplicate content · **Type A** · Weight **2**
- **Measures:** observable duplication or emptiness across sampled pages.
- **Population:** sampled commercial pages.
- **Evidence:** `content.duplication.{exact_duplicate_groups, empty_body_pages, templated_page_urls}`
- **Item satisfies when:** the page has a non-empty body and its `body_text_hash` is not shared with another distinct non-templated sampled page.
- **Violation:** none.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** **Refined in v1**: paginated and filtered variants declared in `templated_page_urls` are excluded from duplicate grouping, removing v0.1's false positives on legitimately templated collection pages. Exact matching after whitespace normalisation only; near-duplicate detection (shingling, embeddings) is deliberately out of scope — it needs a similarity threshold with no validated basis, and an embedding method would not be reproducible across model versions (§5.4).

### Content — informational (Type C, not scored)

| ID | Observation | Why not scored |
|---|---|---|
| **CON-06** | Editorial article count, and word-count distributions for collection and product pages | A raw count with no validated band tells nobody anything, and ten thin posts are not two good guides. v0.1 held it `THRESHOLD-TBD`. Reported as context |
| **CON-10** | Presence and recency of publication/modification dates on editorial content | v0.1's own Limits stated freshness matters far less for heritage and craft content than for news — then scored it anyway, importing generic SEO doctrine. Dates are reported; no recency window is invented |

**Deferred:** CON-08 (topical breadth), CON-09 (topical depth) — see §17.

---

## 11. Entity & Trust — 20%

*Can a machine determine who this brand is, that it is a real business, and that it is the same
entity wherever it appears?*

**Scored: 9 signals, 20 weight points — 7 Type A (16 pts), 2 Type B (4 pts).** Informational: 1.
Retired: 1.

#### ENT-01 — Organization structured data present · **Type A** · Weight **3**
- **Measures:** whether the brand declares itself as a machine-readable entity.
- **Population:** one item — the site.
- **Evidence:** `crawl.pages[].structured_data[]` where `types` includes `Organization` or a subtype.
- **Item satisfies when:** an `Organization` node (or subtype, e.g. `OnlineStore`, `LocalBusiness`) is present and parses on at least one sampled page.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `not_detected`
- **Limits:** Presence only; completeness is ENT-02. Distinct from TEC-12, which measures site-wide structured-data emission regardless of type — a site can pass TEC-12 with only `WebSite` markup and score `not_detected` here (§15).

#### ENT-02 — Organization schema completeness · **Type A** · Weight **3**
- **Measures:** whether the declared entity carries the properties that make it resolvable.
- **Population:** `L-ORG-PROP` (6 members).
- **Evidence:** the `Organization` node's properties.
- **Item satisfies when:** the property is present and non-empty.
- **Violation:** `name` absent.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `fail` · `not_detected` · `not_evaluated`
- **Limits:** **`sameAs` removed from this list in v1** — it was counted here *and* in ENT-07. Property presence is checked, not property truth: a `logo` URL is not fetched, an `address` is not verified to exist. **The audit must never state or imply that declared entity data has been verified.** `not_evaluated` when ENT-01 is `not_detected`. v0.1's "at least two of four" threshold is replaced by declared-list coverage (§6.4).

#### ENT-03 — About page present · **Type A** · Weight **2**
- **Measures:** whether the brand has a discoverable page explaining itself.
- **Population:** one item — the site.
- **Evidence:** `entity.about.{url, present}`, `crawl.sought[]`
- **Item satisfies when:** an About / Our Story page is discoverable in the sample.
- **Violation:** none.
- **Zero state:** `not_detected` — `not_evaluated` if `about` is absent from `crawl.sought[]`.
- **States:** `pass` · `not_detected` · `not_evaluated`
- **Limits:** **Reformulated in v1** to binary presence. v0.1 scored "substantive" against a `THRESHOLD-TBD` word count *and* flagged the judgement for human review inside a signal declared deterministic — an internal contradiction. Word count is now reported informationally, and whether the About page actually establishes the business is ENT-04's job.

#### ENT-04 — Business identity clarity · **Type B** · Weight **3**
- **Measures:** whether a machine reading the homepage and About page could state what this business is, what it sells, and where it operates from.
- **Population:** three declared components — `what_sold_stated`, `location_stated`, `trading_name_stated`.
- **Evidence:** `entity.identity.{what_sold_stated, location_stated, trading_name_stated}` (reviewer-populated)
- **Item satisfies when:** the reviewer records the component as stated explicitly in extractable text.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Review method:** the reviewer reads the homepage and About page and marks each of the three components present or absent **in text**, not in imagery and not by inference from brand knowledge. The reviewer records `reviewer`, `reviewed_at` and `reason` quoting or citing the text relied on.
- **Unreviewed default:** `not_evaluated`.
- **Calibration path:** `location_stated` may become Type A if a postal address in `Organization.address` or a contact page proves a reliable substitute. `what_sold_stated` is unlikely to become deterministic without classification, and should stay Type B unless a fixed category lexicon proves reliable.
- **Limits:** **Absorbs the retired AID-04**, which read this same evidence in the AI dimension and so counted one unmeasurable judgement twice (§16). A heritage brand whose Varanasi origin is obvious to any Indian reader but appears nowhere in text scores that component absent — **and that is the finding**, not an extraction failure. Weight reduced 3→3 within a re-based dimension; in v0.1's scale this is a reduction from 2.73 to 3.00 overall points, effectively flat, which is intentional: the signal is valuable and now honestly labelled.

#### ENT-05 — Contact information completeness · **Type A** · Weight **2**
- **Measures:** whether contact details are discoverable and machine-readable.
- **Population:** `L-CONTACT` (3 members).
- **Evidence:** `entity.contact.{page_present, email, phone, postal_address, contact_form}`, `crawl.sought[]`
- **Item satisfies when:** the channel is present as extractable text.
- **Violation:** none.
- **Zero state:** `not_detected` — `not_evaluated` if `contact` is absent from `crawl.sought[]`.
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Limits:** Details rendered only as images or behind JavaScript-only widgets count as absent. Obfuscation is often deliberate anti-spam practice — the finding must say "not machine-readable", not "missing". A contact form alone satisfies no `L-CONTACT` member and is reported informationally. v0.1's "at least two of three" is replaced by declared-list coverage.

#### ENT-06 — Identity consistency across the site · **Type A** · Weight **2**
- **Measures:** whether the brand name, address, phone and logo alt text agree wherever they appear on the site.
- **Population:** four declared components — brand name, postal address, phone, logo alt text.
- **Evidence:** `entity.consistency.{name_variants[], address_variants[], phone_variants[]}`, `entity.logo_alt`, `crawl.pages[].title`, `Organization.name`
- **Item satisfies when:** the component has exactly one normalised variant across all sources where it appears (case- and punctuation-insensitive, whitespace-collapsed).
- **Violation:** none.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** **Absorbs the retired ENT-11** (brand naming consistency in metadata), which substantially duplicated this signal (§16). "Materially different" — undefined in v0.1 — is now normalised string inequality, which is exact and reproducible. `not_evaluated` for a component with fewer than two occurrences to compare. Legitimate variation (legal entity vs. trading name) presents as `partial` and is a case where **human override is expected**. **On-site consistency only** — no directory, marketplace or third-party source is consulted, and consistency across the wider web must never be claimed.

#### ENT-07 — External entity references (`sameAs`) · **Type A** · Weight **2**
- **Measures:** whether the site links itself to its own profiles elsewhere in a machine-readable way.
- **Population:** one item — the site's `sameAs` declaration.
- **Evidence:** `entity.same_as[]` (URLs declared in `Organization.sameAs`), `entity.social_links_in_markup[]`
- **Item satisfies when:** at least one external profile URL is declared in `Organization.sameAs`.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected`
- **Limits:** `partial` when social links appear in markup but are not declared in `sameAs`. **Declared, not verified** — linked profiles are not fetched, not confirmed to exist and not confirmed to belong to this brand. The evidence statement is "the site declares these references", and the report must say exactly that. v0.1's "two or more" count is gone; one correctly declared reference is a genuine, if minimal, entity link.

#### ENT-09 — Trust and policy pages · **Type A** · Weight **2**
- **Measures:** whether the commercial trust framework is present and discoverable.
- **Population:** `L-POLICY` (5 members).
- **Evidence:** `entity.policies.{privacy, terms, returns, shipping, refunds}`, `crawl.sought[]`
- **Item satisfies when:** a distinct discoverable page exists for that policy type.
- **Violation:** none.
- **Zero state:** `not_detected` — `not_evaluated` if `policy` is absent from `crawl.sought[]`.
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Limits:** Existence and discoverability only. Policy **content** is not read, assessed or judged adequate, and the audit must not imply otherwise. v0.1's "four or more of five" is replaced by declared-list coverage — the list is the standard, so the boundary is no longer arbitrary. Distinct from PRD-11/12, which measure whether the *terms* are machine-readable on the offer (§15).

#### ENT-10 — Credential and certification claims · **Type B** · Weight **1**
- **Measures:** whether the site states credentials (certification marks, council memberships, export registrations) in machine-readable text rather than only as a badge image.
- **Population:** credential claims found on sampled pages.
- **Evidence:** `entity.credentials[]` (claim text, source URL, image-only flag) (reviewer-populated)
- **Item satisfies when:** the reviewer records the claim as present in extractable text with supporting detail.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable` · `not_evaluated`
- **Review method:** the reviewer inspects sampled product and About pages, records each credential claim observed, and marks whether it appears as text or only within an image or unexplained badge. The reviewer records `reviewer`, `reviewed_at` and `reason`.
- **Unreviewed default:** `not_evaluated`. `not_applicable` when the reviewer records that no credential is claimed anywhere.
- **Calibration path:** a declared lexicon of certification-mark names (Silk Mark, Handloom Mark, GI tags, EPC memberships) could make text detection Type A; the image-only determination cannot become deterministic without OCR, which the rubric forbids.
- **Limits:** **This signal records that a claim is made. It never verifies the claim.** No certification register is consulted. Every rendering must read "the site states…". For a Silk Mark claim the correct output is *"stated on the product page; not independently verified by this audit."* Reclassified Type A → Type B in v1 because the image-only determination is a human looking at a picture, which is judgement by definition.

### Entity — informational (Type C, not scored)

| ID | Observation | Why not scored |
|---|---|---|
| **ENT-08** | Author and expert attribution on editorial content | E-E-A-T doctrine with weak demonstrable linkage to AI commerce interpretability for a product retailer. Reported; revisit if concierge data shows it discriminates |

Also reported informationally: About page word count (from the retired scoring component of ENT-03),
and whether a contact form exists without any `L-CONTACT` channel.

**Retired:** ENT-11 — merged into ENT-06 (§16).

---

## 12. Product / AI Shopping Readiness — 20%

*Can an AI shopping system read this catalogue — what is sold, at what price, whether it is
available, and under what terms?*

**Scored: 11 signals, 20 weight points, all Type A.** Informational: 3. Retired: 1.

This dimension is entirely deterministic, which is as it should be: everything here is a property
of markup, not a matter of opinion.

All `PRD-*` scored signals are `not_applicable` when the sample contains no product pages — subject
to the catalogue guard in §4.5, which ensures that absence is reported as a critical finding rather
than silently removed.

#### PRD-01 — Product structured data present and parseable · **Type A** · Weight **3**
- **Measures:** whether product pages emit machine-readable product data that parses and names the product.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].{structured_data_present, parse_ok, name_present}`
- **Item satisfies when:** the page carries a `Product` node that parses and has a non-empty `name`.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** **Absorbs the retired PRD-02** (§16), which scored parseability separately and so counted the same failure three times — here, in TEC-12, and again through the cascade into PRD-03–09. Parseability is not validation against the full vocabulary specification, and is not a prediction that any specific platform will accept the markup.

#### PRD-03 — Price machine-readable · **Type A** · Weight **3**
- **Measures:** whether a price is present in structured data, not merely visible to a human.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].offer.price`, `product.pages[].price_visible_in_text`
- **Item satisfies when:** `offer.price` is a number.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** A price in visible HTML but absent from structured data scores `not_detected` **by design** — the signal measures machine-readability. `price_visible_in_text` is read **only** to phrase the finding correctly ("your prices are visible to shoppers but not exposed to machine readers"), never to alter the state. Without that phrasing the finding reads as an obvious falsehood to a customer looking at their own price tag.

#### PRD-04 — Currency declared · **Type A** · Weight **2**
- **Measures:** whether the currency of each price is unambiguously declared.
- **Population:** sampled product pages with a price in structured data.
- **Evidence:** `product.pages[].offer.price_currency`
- **Item satisfies when:** `price_currency` is a valid ISO 4217 code.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable` · `not_evaluated`
- **Limits:** `not_evaluated` when no sampled product has a price. Especially consequential for export brands: an undeclared currency makes a price ambiguous to any cross-border system. Multi-currency sites serving different currencies by geography cannot be fully assessed from a single-locale collection — `metadata.locale` records the collection locale and the limitation is stated.

#### PRD-05 — Availability declared · **Type A** · Weight **1**
- **Measures:** whether purchasability is declared in machine-readable form.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].offer.availability`
- **Item satisfies when:** `availability` is a recognised enum value.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** A snapshot at collection time, not reconciled against any inventory source. Weight reduced from v0.1's relative level: availability matters less than currency for cross-border discovery, and for made-to-order heritage products it is often genuinely ambiguous.

#### PRD-06 — Product identifier present · **Type A** · Weight **1**
- **Measures:** whether products carry a stable identifier a machine can key on.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].{sku, gtin, mpn, product_id}`
- **Item satisfies when:** `sku` or any GTIN-family identifier is present and non-empty.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** Presence, not validity — no checksum validation, no registry lookup. GTINs are frequently inapplicable to handmade and one-of-a-kind heritage products; `sku` alone is a legitimate `pass`, deliberately.

#### PRD-07 — Brand declared on product · **Type A** · Weight **1**
- **Measures:** whether each product declares the brand it belongs to.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].brand`
- **Item satisfies when:** `brand` is present and non-empty.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** Not checked for agreement with `site.brand_name` — multi-brand retailers are legitimate.

#### PRD-08 — Variants represented · **Type A** · Weight **1**
- **Measures:** whether purchasable variants are exposed to machines, not only to the storefront UI.
- **Population:** sampled product pages where `has_variant_selector` is true.
- **Evidence:** `product.pages[].{variants[], has_variant_selector}`
- **Item satisfies when:** `variants[]` is non-empty.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** `not_applicable` when no sampled product offers variants. `has_variant_selector` is detected from the presence of a form control bound to product options in the markup; client-side-only selectors are invisible without rendered evidence. Variant *sets* are not checked for completeness against the storefront.

#### PRD-09 — Machine-readable product attributes · **Type A** · Weight **3**
- **Measures:** whether product attributes are structured properties rather than prose or imagery.
- **Population:** `L-ATTR-STRUCT` (6 members), assessed across sampled product pages.
- **Evidence:** `product.pages[].attributes{}`
- **Item satisfies when:** the attribute is present as a structured property on at least one sampled product page.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** Attributes in prose but not structured score `not_detected` here and are credited by CON-04. The two are intentionally different measurements of the same underlying fact — machine-readable versus human-readable — and both must be read to state the finding correctly (§15). v0.1's "three or more" is replaced by declared-list coverage.

#### PRD-10 — Review markup integrity · **Type A** · Weight **1**
- **Measures:** whether reviews that exist are represented in structured data — and whether rating markup exists without any visible reviews.
- **Population:** sampled product pages with reviews visible on the page.
- **Evidence:** `product.pages[].{aggregate_rating, review_count, reviews_visible_on_page}`
- **Item satisfies when:** reviews are visible on the page **and** an `aggregate_rating` is present.
- **Violation:** any sampled product page where `aggregate_rating` is present and `reviews_visible_on_page` is false.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `fail` · `not_detected` · `not_applicable`
- **Limits:** **`fail` was required by v0.1's own text but missing from its state list — fixed in v1** (§16). Rating markup without corresponding visible reviews is a policy violation on major platforms and is reported as a risk, never as a pass. `not_applicable` when the site collects no reviews at all. The audit never assesses whether reviews are genuine.

#### PRD-11 — Shipping terms machine-readable · **Type A** · Weight **2**
- **Measures:** whether shipping terms are machine-readable on the offer, rather than only in a policy page.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].shipping_details`, `entity.policies.shipping`
- **Item satisfies when:** structured shipping terms are present on the offer.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** `partial` when a shipping policy page exists but terms are not structured on the offer. High relevance for export brands, where shipping terms and duties often decide the purchase and are almost never machine-readable. **The distinction between "has a policy" (ENT-09) and "the terms are machine-readable" (here) must survive into the report** — they are different findings with different fixes.

#### PRD-12 — Returns terms machine-readable · **Type A** · Weight **2**
- **Measures:** whether returns terms are machine-readable on the offer.
- **Population:** sampled product pages.
- **Evidence:** `product.pages[].return_policy`, `entity.policies.returns`
- **Item satisfies when:** a structured return policy is present on the offer.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** As PRD-11.

### Product — informational (Type C, not scored)

| ID | Observation | Why not scored |
|---|---|---|
| **PRD-00** | **Machine-readable catalogue detected** — whether any sampled page is a product page carrying product data | **New in v1.** Always evaluated. When false for a site audited as ecommerce it triggers the mandatory critical finding in §4.5. Not scored because the Product dimension is unscored in exactly that case; its job is to stop the weakness disappearing |
| **PRD-13** | Breadcrumb markup and `category` property on product pages | Substantially the same implementation as AID-06's breadcrumb component. Scored once, in AID-06, and reported here as product-level context |
| **PRD-14** | Product image alt text and images declared in structured data | Retained as an observation: alt text quality cannot be assessed mechanically beyond non-emptiness and not-a-filename, and the scored weight is better spent on facts that determine whether a product can be represented at all |

**Retired:** PRD-02 — merged into PRD-01 (§16).

---

## 13. AI Discoverability Readiness — 15%

*Can a machine system reach this site, extract facts from it, and reproduce them accurately in an
answer?*

**Scored: 7 signals, 15 weight points — 5 Type A (12 pts), 2 Type B (3 pts).** Informational: 1.
Retired: 1. Deferred: 1.

> **Scope statement, which must appear verbatim in every audit rendering this dimension:**
> *This dimension measures readiness and answerability from observable evidence. It does not measure,
> and does not claim to measure, whether this brand appears in or is cited by ChatGPT, Gemini,
> Perplexity, Google AI Overviews or any other AI system.*

#### AID-01 — Answer-first content structure · **Type B** · Weight **1**
- **Measures:** whether informational content states its answer where a machine will find it.
- **Population:** sampled editorial and FAQ pages.
- **Evidence:** `ai.answerability.{pages_with_lead_answer, question_headings[]}` (reviewer-populated)
- **Item satisfies when:** the reviewer records that the page states a direct answer within its opening passage, under a question-form or directly descriptive heading.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable` · `not_evaluated`
- **Review method:** the reviewer reads the opening passage of each sampled informational page and records whether a direct answer appears before supporting narrative. Records `reviewer`, `reviewed_at`, `reason`.
- **Unreviewed default:** `not_evaluated`. `not_applicable` when CON-05 is `not_detected`.
- **Calibration path:** heading-form detection against a declared interrogative-pattern list could make this Type A for English; it is unvalidated for Devanagari and other Indic scripts, and must not be assumed transferable.
- **Limits:** Cannot assess whether the answer is *correct*. Weight reduced to 1 in v1: it is genuine GEO practice but the least evidentially grounded signal in the dimension, and it should not carry weight disproportionate to its reliability.

#### AID-02 — Key facts as text rather than imagery · **Type B** · Weight **2**
- **Measures:** whether the facts that matter exist as text a machine can extract, or only inside images.
- **Population:** `L-FACT` (7 members).
- **Evidence:** `ai.facts.{facts_in_text[], facts_image_only[]}` (reviewer-populated)
- **Item satisfies when:** the reviewer records the fact as present in extractable text.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Review method:** the reviewer inspects sampled home, product and policy pages and marks each `L-FACT` member as *in text*, *image only*, or *absent*. Records `reviewer`, `reviewed_at`, `reason`.
- **Unreviewed default:** `not_evaluated`.
- **Calibration path:** the *in text* determination could become Type A via declared lexicons per fact. **The *image only* determination cannot become deterministic without OCR, which the rubric forbids** — so a fully Type A version of this signal would measure something narrower than what it measures today.
- **Limits:** **Reclassified Type A → Type B in v1 because it was logically unproduceable as specified.** v0.1 required `facts_image_only[]` while forbidding OCR: you cannot know a fact is *only* in an image without reading the image. A human reviewer reading the image is the honest answer, and that is judgement. **Also absorbs the image-only component of the retired AID-10.** This is the signal that names the most common failure of visually-led heritage brands — provenance, craft and care living entirely in lookbook imagery — which is why it was reformulated rather than removed.

#### AID-03 — FAQ content and markup · **Type A** · Weight **2**
- **Measures:** whether question-and-answer content exists and is marked up as such.
- **Population:** one item — the site.
- **Evidence:** `ai.faq.{faq_pages[], faqpage_schema_present}`, `crawl.sought[]`
- **Item satisfies when:** FAQ content exists **and** carries `FAQPage` structured data.
- **Violation:** none.
- **Zero state:** `not_detected` — `not_evaluated` if `faq` is absent from `crawl.sought[]`.
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Limits:** `partial` when FAQ content exists without markup, or markup exists without substantive content. Rich-result eligibility for FAQ markup has been narrowed by search platforms and varies over time; what is scored here is machine-extractability of question/answer pairs, **not** an implied rich result. Recommendations derived from this signal must not promise rich results.

#### AID-06 — Semantic relationships · **Type A** · Weight **1**
- **Measures:** whether relationships between entities and pages are expressed explicitly.
- **Population:** `L-RELATION` (3 members).
- **Evidence:** `ai.relationships.{breadcrumbs_present, entity_links_present, about_mentions_present}`
- **Item satisfies when:** the mechanism is present anywhere in the sample.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected`
- **Limits:** Presence of the mechanism, not correctness of the relationships expressed. **Now the sole scored home of breadcrumb markup** — PRD-13 is informational, removing v0.1's double count. v0.1's "two or more mechanisms" is replaced by declared-list coverage.

#### AID-07 — Content available without client-side rendering · **Type A** · Weight **4**
- **Measures:** whether content is present in the raw HTML response, without executing client-side code.
- **Population:** `L-RAWHTML` (3 members), assessed across sampled commercial pages.
- **Evidence:** `crawl.pages[].raw_html_contains.{h1_text, body_text, primary_commercial_fact}`
- **Item satisfies when:** the content element is present in the raw HTML response on every sampled commercial page where it is present in the rendered response.
- **Violation:** none.
- **Zero state:** `fail`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** **Reformulated in v1.** v0.1 compared raw and rendered text *lengths* against an undefined notion of "substantive body text" — a large inline navigation or cookie banner could mask entirely JS-rendered product content, and any ratio cut-off would have been an invented threshold. v1 checks whether specific content elements survive in raw HTML, which is structural and needs no number. Requires `render_mode = both`; otherwise `not_evaluated`. Some AI crawlers execute JavaScript and some do not, and which do changes over time — the finding describes the risk and must never assert that a specific named system cannot see the content. **Weight raised to 4**: this is the most consequential single technical property for AI extractability, and it was underweighted relative to signals measuring markup that a non-rendering crawler would never reach.

#### AID-08 — AI-agent crawl directives · **Type A** · Weight **3**
- **Measures:** what the site declares to named AI and assistant user agents.
- **Population:** `L-AIAGENT` members appearing in `robots.txt`.
- **Evidence:** `crawl.robots_txt.agent_rules{}`, `site.stated_objectives`
- **Item satisfies when:** the agent is not disallowed from the site's commercial paths.
- **Violation:** the site disallows one or more `L-AIAGENT` members from commercial paths **and** `site.stated_objectives` includes an AI-visibility objective.
- **Zero state:** `partial` — see Limits.
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Limits:** **Weight raised 1 → 3 in v1 — reasoning in §19.2.** This signal has a deliberately unusual zero state. Blocking AI agents can be a legitimate commercial decision, particularly for textile and handicraft brands whose designs are routinely copied, so blocking alone is **never** `fail` — it yields `partial` with an informational finding describing the consequence. It becomes `fail` only when it contradicts an objective the brand itself stated. **The signal records what the site declares; it does not tell the brand to unblock**, and `site.stated_objectives` is a human-supplied fact, never an inference about the business. `not_evaluated` when no `robots.txt` was retrieved. **When `L-AIAGENT` is empty**, the population has no members to evaluate, so AID-08 returns **`not_evaluated`** — not `not_applicable` (the rule still applies to the site; the audit simply lacks the rubric data to run it) and not `pass` (§7; resolved in Phase 3 planning). The list is never invented to create members; supplying members is a rubric version bump (§18).

#### AID-09 — Commercial facts as text · **Type A** · Weight **2**
- **Measures:** whether the commercial facts a buyer asks about exist as extractable text.
- **Population:** `L-COMMERCIAL` (3 members).
- **Evidence:** `ai.commercial_facts.{price_in_text, shipping_in_text, returns_in_text}`
- **Item satisfies when:** the fact is present as an extractable text node on a sampled page.
- **Violation:** none.
- **Zero state:** `not_detected`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Limits:** Complements PRD-03/11/12, which measure *structured* representation of the same three facts. A site can pass here and fail there — text a human reads is not markup a shopping system consumes — and **both belong in the report as distinct findings** (§15). Remains Type A because presence of a text node matching a declared pattern is mechanical; the *image-only* question is AID-02's, and is Type B for that reason.

### AI Discoverability — informational (Type C, not scored)

| ID | Observation | Why not scored |
|---|---|---|
| **AID-05** | Inventory of distinct structured-data types found across the sample | Pure proxy inflation. Counting schema types re-rewards exactly what TEC-12, ENT-01 and PRD-01 already score, and v0.1's "three or more distinct types" was an invented threshold. The inventory is genuinely useful in the report; the score was double-counting (§15) |

**Retired:** AID-04 — merged into ENT-04 (§16).
**Deferred:** AID-10 (semantic-HTML ratio) — see §17; its image-only component moved into AID-02.

---

## 14. Cross-cutting rules

### 14.1 Sampling

Every signal is evaluated over `crawl.pages` — the pages actually collected — and **never** over "the
site". The audit records `crawl.sample` (page count, depth, selection method, `sought[]`, collection
timestamp, locale, render mode) and every rendering states it. A site with 4,000 products assessed
from 25 pages is a **sample**, and the report says so.

### 14.2 Applicability

| Condition | Effect |
|---|---|
| No product pages in the sample | All scored `PRD-*` → `not_applicable`; dimension unscored; **catalogue guard fires** (§4.5) |
| No editorial content (CON-05 `not_detected`) | CON-11, AID-01 → `not_applicable` |
| No collection pages | CON-01, CON-02 → `not_applicable` |
| No sampled product offers variants | PRD-08 → `not_applicable` |
| No reviews anywhere in the sample | PRD-10 → `not_applicable` |
| No credential claimed (reviewer-confirmed) | ENT-10 → `not_applicable` |
| Fewer than 3 pages sampled | TEC-11 → `not_evaluated` |
| `render_mode` ≠ `both` | AID-07 → `not_evaluated` |
| Target absent from `crawl.sought[]` | That signal → `not_evaluated`, never `not_detected` (§4.4) |

Applicability is determined **from evidence**, never from assumption about the brand.

### 14.3 Findings must group by root cause

**New in v1, and binding on the report layer.** Several signals can resolve to `not_detected` from a
single underlying cause — most commonly, a site emitting no structured data at all will trip TEC-12,
ENT-01, ENT-02, ENT-07, PRD-01 and every dependent product signal simultaneously.

The scoring is correct in that case: the brand genuinely is unreadable in many distinct ways. But the
**report must not present sixteen symptoms of one root problem as sixteen unrelated recommendations.**
Finding assembly groups signals sharing a root cause into one finding carrying multiple `signal_ids`,
with one recommendation. Otherwise a ₹2,499 Blueprint reads as padding, and H4 satisfaction suffers
for a reason that has nothing to do with the diagnosis being wrong.

### 14.4 Human override

A reviewer may override any signal state — Type A or Type B. Overrides are **recorded, never
silent**: original state, override state, reviewer and reason are all stored (`audit-spec.md` §7.2).

For **Type B signals, a reviewer state is not an override** — it is the signal's normal input, and is
recorded as a review, not a correction. Only a change to an already-recorded state is an override.

An audit containing overrides reports its score as **reviewed**. The override log is the single most
valuable artefact the concierge phase produces: it is the enumerated list of everywhere the rules were
wrong, and it is the primary input to recalibration.

### 14.5 What the score is not

The overall score is a **readiness measurement against this rubric at this version**. It is not a
prediction of traffic, rankings, revenue or AI citations; it is not comparable to any third-party
score; and it is not comparable across rubric versions. Every rendering states the rubric version
alongside the score, and both the deterministic and assessed scores (§3).

### 14.6 Auditability requirement

For any score, it must be possible to answer mechanically, without re-running a crawl:

1. Which signals contributed, in which states, at which weights, of which type.
2. Which evidence path produced each state, and — for Type B — which reviewer, when, and why.
3. Which signals were excluded, under which state and reason.
4. Coverage, confidence and reviewer-dependent weight share, per dimension.
5. Which rubric version and which declared-list versions applied.
6. Which states were overridden, by whom and why.
7. Both the deterministic and the assessed score, and the difference between them.

If any of those cannot be answered from the stored audit record, the score is not auditable and the
implementation is incomplete — regardless of whether the number is correct.

---

## 15. Structured-data weight concentration — analysis and conclusion

The v0.1 review found ~28 of 100 overall points depending on structured data across 18 signals, and
asked whether that constituted double-counting. The instruction was to analyse rather than reflexively
reduce. This section is the conclusion.

### 15.1 The v1 position

**32 of 100 points read structured data.** Of those, **20 are the entire Product dimension**, where
structured data is not a proxy for the thing being measured — it *is* the thing being measured. "Can
an AI shopping system read this catalogue" has no other answer.

### 15.2 Overlaps eliminated as genuine double-counting

| Removed | Why it was double-counting |
|---|---|
| **PRD-02** (parseability) → merged into PRD-01 | TEC-12 already scored parseability site-wide, PRD-01 scored presence, and an unparseable block already zeroed PRD-03–09 through the cascade. The same failure was counted three times |
| **AID-05** (schema type breadth) → informational | Counting distinct types re-rewards exactly the emission that TEC-12, ENT-01 and PRD-01 already score. A site gained points for having `BreadcrumbList` on top of the points it had already gained for `BreadcrumbList` |
| **PRD-13** (breadcrumbs) → informational | The same markup was scored here and in AID-06 |
| **`sameAs` in `L-ORG-PROP`** → ENT-07 only | The property was counted inside ENT-02's completeness list *and* as its own signal |

### 15.3 Overlaps retained, with justification

| Signals | Why they are genuinely distinct |
|---|---|
| **TEC-12 vs ENT-01 vs PRD-01** | Different questions with different answers. A site can emit only `WebSite` markup: TEC-12 `pass`, ENT-01 `not_detected`, PRD-01 `not_detected`. Another emits perfect `Product` data and no `Organization`. Collapsing them would lose the ability to say *which* machine-readable layer is missing, which is the actionable part |
| **PRD-09 vs CON-04** | Machine-readable attributes versus attributes stated in human-readable text. A heritage brand routinely has one without the other, and the fix differs: one is a markup change, the other is copywriting |
| **PRD-03/11/12 vs AID-09** | Structured representation versus text presence of the same three commercial facts. A site can show a price to a shopper and hide it from a shopping agent. Both are real findings with different remedies |
| **ENT-02 vs ENT-07** | Entity properties versus external references — now cleanly separated, with `sameAs` scored once |

### 15.4 Conclusion

**No further reduction is recommended.** The concentration is a property of the domain, not an
artefact of the rubric: for a product measuring machine interpretability, structured data is the
primary mechanism by which machines interpret commerce sites. Reducing its weight would make the
score easier to defend and less true.

The residual risk is **not** in scoring — it is in reporting, and it is handled by the root-cause
grouping rule in §14.3. A site with no JSON-LD should receive one prominent finding, not sixteen.

---

## 16. Retired signals

IDs are permanent. These are recorded, never reused, never deleted (§18).

| ID | v0.1 treatment | Disposition | Reason |
|---|---|---|---|
| **ENT-11** | Scored, weight 1 — brand naming consistency in metadata | **Merged into ENT-06** | Substantially duplicated ENT-06's identity-consistency measurement over an overlapping evidence set |
| **PRD-02** | Scored, weight 2 — Product schema parses | **Merged into PRD-01** | Triple-counted against TEC-12 and the PRD-03–09 cascade (§15.2) |
| **AID-04** | Scored, weight 2 — entity clarity for extraction | **Merged into ENT-04** | Read ENT-04's evidence and was documented as an intentional duplicate. "Intentional" did not make it measurable; it counted one unmeasurable judgement twice |
| **AID-10** | Scored, weight 2 — content extractability | **Split** | Image-only component → AID-02 (Type B). Semantic-HTML ratio → deferred (§17). Its `tabular_data_as_tables` component was judgement and is now part of AID-02's review method |

---

## 17. Deferred signals

Defined, not active in v1. Not scored, not reported.

| ID | Signal | Why deferred | What would activate it |
|---|---|---|---|
| **TEC-04** | Sitemap covers key page types | Measured against a sample, so it can only ever say "the sampled pages appear in the sitemap" — a weak inference with low AI-commerce relevance | Full sitemap-versus-catalogue comparison, which requires catalogue size from a source the audit does not currently have |
| **CON-08** | Topical breadth | Topic assignment is not reproducible without either a fixed taxonomy with keyword rules, or a model — and a model-assigned topic is not evidence (`engineering-rules.md` §4) | A declared topic taxonomy with deterministic assignment rules, derived from concierge audits |
| **CON-09** | Topical depth | Depends entirely on CON-08's taxonomy | As CON-08 |
| **AID-10** | Semantic-HTML ratio | Any ratio cut-off would be an invented threshold, and the metric's relationship to actual extractability is unestablished | Concierge data showing the ratio discriminates between sites in a way the other AI signals do not |

Deferring is not deletion. Each remains a candidate for v2 with a stated activation condition, which
is a stronger position than v0.1's `THRESHOLD-TBD` — those sat inside the scored rubric depressing
coverage while measuring nothing.

---

## 18. Versioning

Every scored audit records `scoring.rubric_version`. A version bump is required for any change to:

- a signal's weight, type, states, population, satisfaction rule, violation conditions or zero state;
- a declared list's membership (§7), including `L-AIAGENT`;
- the state value mapping, aggregation algorithm, coverage bands or rounding rule;
- a dimension weight.

**Scores from different rubric versions are not comparable** and must not be trended against each
other. Signal IDs are permanent: a retired signal is marked retired, never deleted and never reused.

---

## 19. Weight review

Every weight was re-derived for v1 rather than inherited. The governing question was not "is this
easy to detect?" but "how much should this be able to move a founder's score?".

### 19.1 Principles applied

1. **Weight = maximum overall-score impact in points** (§1.1). A weight of 3 means the signal can move
   the overall score by 3 points, in any dimension.
2. **Detectability is not importance.** TEC-01, TEC-09 and TEC-14 are trivially detectable and were
   demoted to informational precisely because ease of measurement had been doing the work that
   importance should have done.
3. **Evidence quality caps weight.** TEC-11 fell from 2 to 1 because "orphan within a sample" cannot
   support a strong claim. AID-01 sits at 1 because reviewer agreement on "answer-first" is the least
   established judgement in the rubric.
4. **Commercial consequence raises weight.** CON-03 (4) and CON-07 (5) carry the findings most likely
   to produce problem resonance. AID-07 (4) determines whether anything else in the AI dimension can
   be reached at all.
5. **Duplicates lose weight or lose scoring.** Every retirement in §16 released weight that was
   redistributed to distinct signals within the same dimension, not spread across the rubric.

### 19.2 AID-08 — decision on the proposed weight increase

The review proposed raising AID-08 from 1 to 3. **Accepted, with a structural change to its states.**

**Why the increase is justified:**

- It is the **only** signal measuring whether AI systems are permitted to access the site at all.
  Every other signal in the AI Discoverability dimension is conditional on that access. Scoring
  answerability at 15% while scoring accessibility at 1 point put the conditional above the condition.
- It is **fully deterministic** — parsing declared agent rules against a versioned list (§7) — so it
  carries no evidence-quality discount.
- It is **commercially decisive**: a brand paying for AI visibility while blocking AI crawlers is the
  single most actionable finding this product can produce, and the cheapest to fix.
- The v0.1 arrangement was **internally inconsistent for this product's positioning**: blocking search
  crawlers (TEC-02) was weighted 3, blocking AI crawlers was weighted 1. In an AI Commerce Visibility
  product that ordering is indefensible. They are now equal at 3 points each.

**Why it is not a simple increase.** Raising the weight without changing the states would have made
the rubric punish a legitimate commercial choice. Blocking AI crawlers is a defensible decision for
textile and handicraft brands whose designs are routinely copied — and the review flagged this. So
v1 changes the zero state:

- blocking AI agents alone → **`partial`**, with an informational finding describing the consequence;
- blocking AI agents **while the brand has stated an AI-visibility objective** → **`fail`**.

The signal now weighs what it should weigh, without telling brands what their commercial strategy
ought to be. `site.stated_objectives` is a human-supplied fact, never an inference.

### 19.3 Dimension weights — flagged, not changed

Per instruction, the five dimension weights are unchanged: 20 / 25 / 20 / 20 / 15.

**One concern is flagged for the product owner rather than acted on:**

> **AI Discoverability Readiness is the lowest-weighted dimension (15%) in a product called
> AI Brand Pulse whose promise is AI visibility.**

The defence is real: AI readiness is substantially delivered *through* the Product dimension
(machine-readable catalogue) and the Entity dimension (resolvable brand identity), so the model
weights AI readiness far above 15% in substance. But this will be asked by a customer, and possibly
by a prospect deciding whether to buy, so the answer should exist in writing before it is asked.

**Recommendation: leave unchanged through the concierge batch.** Then test it against evidence —
specifically, whether the AI Discoverability dimension discriminates between audited sites more or
less than its 15% implies (`validation-plan.md` §3, H2). Changing it now would be substituting one
untested intuition for another.

A second, smaller observation: Content at 25% now carries 9 points of Type B judgement, so
**9% of the overall assessed score is reviewer opinion concentrated in one dimension**. That is
disclosed by design (§3), but if the concierge batch shows low reviewer consistency on CON-04 and
CON-07, the correct response is to reduce those signals' weight, not to reduce the Content dimension.

---

## 20. Changelog — v0.1 → v1.0

### 20.1 Rubric-level changes

| Change | Previous | New | Reason | Validation implication |
|---|---|---|---|---|
| **Global aggregation rule** | 18 signals specified no aggregation; 16 used "some" / "most" / "a minority" | One canonical algorithm (§6), applied by every multi-item signal | Two implementations could not have agreed on 34 of 62 signals. The determinism claim in `engineering-rules.md` §3 was not met | Concierge audits must record `items_applicable` / `items_evaluated` per signal so the proportion rule can be checked against reviewer intuition |
| **Signal types A / B / C** | None — all signals presented as deterministic | Explicit classification (§2) | ~19 overall points rested on judgement expressed as evidence fields with objective-sounding names | Reviewer consistency on Type B signals becomes a measurable property of the concierge batch |
| **Two scores** | One score | `deterministic` + `assessed`, both always shown (§3) | A single number concealed how much was judgement | Lets the SaaS decision compare what software alone could have produced against what the concierge audit produced |
| **Weight totals rebased** | 28 / 22 / 22 / 28 / 20 against weights 20 / 25 / 20 / 20 / 15 | Totals equal dimension weights; 1 weight point = 1 overall point | One weight point was worth 1.59× more in Content than Technical, making cross-dimension calibration meaningless | Post-batch weight changes are now directly interpretable as "points of score" |
| **`crawl.sought[]` requirement** | Absent — `not_detected` could fire for page types never looked for | Target not in `sought[]` → `not_evaluated` (§4.4) | A sampling limitation was scoring as a site failure, breaching the product's core honesty rule | Concierge collection checklists must be recorded per audit, not assumed |
| **Catalogue guard (PRD-00)** | Product dimension silently excluded when no products found | Mandatory `critical` finding + `catalogue_detected` flag (§4.5) | `not_applicable` was deleting the most commercially important finding an ecommerce visibility audit can make | Any audited site with no machine-readable catalogue is now a recorded data point rather than a gap |
| **Violation conditions** | Overlapping `pass` / `fail` branches with no precedence | Violations evaluated before proportion (§6.2 step 3) | TEC-06 could satisfy `pass` and `fail` simultaneously; the score depended on implementation order | Removes a class of disagreement between hand-scored and engine-scored audits |
| **Declared lists** | Arbitrary counts: "≥4 of 5", "≥3", "≥2", "≥2 of 4" | Versioned declared lists with all / some / none coverage (§6.4, §7) | None of those integers was justified by data, while other signals were honestly marked `THRESHOLD-TBD` — internally inconsistent | List membership becomes the calibration target, which is a clearer question than "is the threshold 3 or 4?" |
| **No numeric thresholds** | 10 `THRESHOLD-TBD` signals, 5 permanently `not_evaluated` | Zero thresholds in scoring; zero `THRESHOLD-TBD` remaining | Permanently-unscorable signals depressed coverage forever (Content capped at 0.864) while measuring nothing | Every dimension can now reach coverage 1.0, so low confidence means incomplete collection rather than rubric debt |
| **Root-cause finding grouping** | Not specified | Binding on report assembly (§14.3) | 32 points can move on one missing implementation; sixteen recommendations for one root cause reads as padding | Directly protects H4 (Blueprint satisfaction) |

### 20.2 Signal-level changes

| ID | Previous | New | Reason | Validation implication |
|---|---|---|---|---|
| TEC-01 | Scored A, w1 | **Informational** | Absence of `robots.txt` means "allow all"; scoring rewarded a no-op | None — remains an evidence precondition |
| TEC-04 | Scored A, w1 | **Deferred** | Sample-bound inference, low AI relevance | Revisit with catalogue-size evidence |
| TEC-06 | Overlapping branches | Violations declared explicitly | Non-deterministic as written | Hand and engine scores can now agree |
| TEC-07 | Total duplication scored `partial` | Total duplication is a violation → `fail` | Five pages titled "Home" scored 50% | Sharpens a common, visible finding |
| TEC-08 | Scored A, w1, permanent `THRESHOLD-TBD` | **Informational** | No length rule defensible across Devanagari and Latin | Removes permanent coverage drag |
| TEC-09 | Scored A, w1 | **Informational** | SEO hygiene, negligible machine-interpretability effect | Reduces SEO/GEO conflation in the report |
| TEC-11 | Scored A, w2, "Internal linking" | Scored A, **w1**, "Internal reachability within the sample" | Name implied a site-wide claim the sample cannot support | Weaker claim, honestly weighted |
| TEC-14 | Scored A, w1 | **Informational** | A declared viewport tag has no bearing on machine interpretability | — |
| TEC-15 | Scored A, w2, permanent `THRESHOLD-TBD` | **Informational** | Real performance is field data; a synthetic number is not it | Removes permanent coverage drag |
| CON-02 | `THRESHOLD-TBD` word count + "non-boilerplate" | Structural DOM fact: body text outside the product grid | Judgement and an uncalibrated band, in a signal declared deterministic | Word counts reported, not scored |
| CON-03 | `THRESHOLD-TBD` word count, w3 | Presence of description text, **w4** | Word count is a poor proxy for heritage products; no band was justifiable | The substantive question moves to CON-04 |
| CON-04 | Scored **A**, w3 | Scored **B**, w4 | Detecting "states material" in prose requires NLP or a human. It was judgement labelled as evidence | Reviewer consistency becomes measurable; lexicon calibration path defined |
| CON-05 | Scored A, w2 | Scored A, **w3** | Absorbs weight released by demoting CON-06/CON-10 | — |
| CON-06 | Scored A, w1, `THRESHOLD-TBD` | **Informational** | A raw count with no validated band tells nobody anything | — |
| CON-07 | Scored **A**, w3 | Scored **B**, w5 | Page→intent assignment had no specified method. Highest commercial value in the rubric, so retained and honestly typed rather than deleted | The heaviest judgement in the rubric; reviewer agreement must be tracked |
| CON-08, CON-09 | Scored A, w1 each, `THRESHOLD-TBD` | **Deferred** | Topic assignment is not reproducible without a taxonomy or a model | Taxonomy is a concierge deliverable |
| CON-10 | Scored A, w1, `THRESHOLD-TBD` | **Informational** | v0.1's own Limits said freshness barely applies to heritage content | Removes imported SEO doctrine |
| CON-11 | Scored A, w2 | Scored A, **w3** | Absorbs released weight; genuinely distinct from TEC-11 | — |
| CON-12 | Exact duplicates only | Templated pages excluded from grouping | False positives on legitimately templated collection pages | — |
| ENT-02 | `sameAs` in property list, "≥2 of 4" | `L-ORG-PROP` coverage, `sameAs` removed | `sameAs` was double-counted with ENT-07; the threshold was arbitrary | — |
| ENT-03 | `THRESHOLD-TBD` "substantive" + human-review flag inside a deterministic signal | Binary presence, A, w2 | Internal contradiction | Word count reported |
| ENT-04 | Scored **A**, w3 | Scored **B**, w3, absorbing AID-04 | Three judgement booleans with no extraction rule | Reviewer consistency measurable |
| ENT-05 | "≥2 of 3" | `L-CONTACT` coverage | Arbitrary threshold | — |
| ENT-06 | "materially different" undefined | Normalised string inequality; absorbs ENT-11 | Undefined comparison; duplicate signal | — |
| ENT-07 | "≥2 sameAs" | At least one declared reference | Arbitrary count | — |
| ENT-08 | Scored A, w1 | **Informational** | E-E-A-T doctrine, weak AI-commerce linkage for a product retailer | Revisit if concierge data shows discrimination |
| ENT-09 | "≥4 of 5" | `L-POLICY` coverage | Arbitrary threshold; the list is the standard | — |
| ENT-10 | Scored **A**, w1 | Scored **B**, w1 | The image-only determination is a human looking at a picture | High segment relevance retained |
| ENT-11 | Scored A, w1 | **Retired** → ENT-06 | Duplicate | — |
| PRD-01 | Presence only, w3 | Presence + parseability + name, w3 | Absorbs PRD-02 | — |
| PRD-02 | Scored A, w2 | **Retired** → PRD-01 | Triple-counted | — |
| PRD-05 | w2 | **w1** | Availability matters less than currency for cross-border discovery, and is genuinely ambiguous for made-to-order goods | — |
| PRD-09 | "≥3 attributes" | `L-ATTR-STRUCT` coverage | Arbitrary count | — |
| PRD-10 | `fail` required by its Limits but absent from its States | `fail` declared; violation condition explicit | **State-model contradiction fixed** | — |
| PRD-13, PRD-14 | Scored A, w1 each | **Informational** | PRD-13 duplicated AID-06's breadcrumb scoring; PRD-14's alt-text quality is not mechanically assessable | — |
| PRD-00 | Did not exist | **New, informational** | Catalogue guard (§4.5) | New data point on every audit |
| AID-01 | Scored **A**, w2 | Scored **B**, w1 | "Answer near the top" is judgement, and heading-form detection is unvalidated for Indic scripts | Least established judgement; weighted accordingly |
| AID-02 | Scored **A**, w3 | Scored **B**, w2 | **Logically unproduceable as specified**: required `facts_image_only[]` while forbidding OCR | Names the most common heritage-brand failure; retained as review |
| AID-04 | Scored A, w2 | **Retired** → ENT-04 | Counted one unmeasurable judgement twice | — |
| AID-05 | Scored A, w2 | **Informational** | Proxy inflation over TEC-12 / ENT-01 / PRD-01 | Inventory still reported |
| AID-06 | "≥2 mechanisms", w1 | `L-RELATION` coverage, w1, sole home of breadcrumbs | Arbitrary count; PRD-13 duplication | — |
| AID-07 | Text-length comparison, "substantive" undefined, w3 | `L-RAWHTML` content-presence checks, **w4** | Length ratio was gameable and needed an invented cut-off; this is the most consequential AI-extractability property | — |
| AID-08 | Scored A, **w1** | Scored A, **w3**, zero state `partial` | See §19.2 | The product's namesake signal, correctly weighted without dictating strategy |
| AID-10 | Scored A, w2, `THRESHOLD-TBD` | **Retired / deferred** (split) | Ratio needed an invented cut-off; image component belongs in AID-02 | — |

---

## 21. Rubric quality summary

### 21.1 Counts

| Category | Count | Weight |
|---|---:|---:|
| **Total signal IDs defined** | **63** | — |
| Scored signals | **44** | **100** |
|   — Type A (deterministic) | 38 | 84 |
|   — Type B (reviewer-assessed) | 6 | 16 |
| Type C (informational, not scored) | 12 | 0 |
| Deferred | 4 | 0 |
| Retired | 3 | 0 |

*(63 = 44 scored + 12 informational + 4 deferred + 3 retired. v0.1 defined 62; PRD-00 is new.)*

### 21.2 By dimension

| Dimension | Weight | Scored | Type A (wt) | Type B (wt) | Info | Deferred | Retired |
|---|---:|---:|---:|---:|---:|---:|---:|
| Technical SEO | 20% | 9 | 9 (20) | 0 (0) | 5 | 1 | 0 |
| Content & Topical Authority | 25% | 8 | 6 (16) | 2 (9) | 2 | 2 | 0 |
| Entity & Trust | 20% | 9 | 7 (16) | 2 (4) | 1 | 0 | 1 |
| Product / AI Shopping Readiness | 20% | 11 | 11 (20) | 0 (0) | 3 | 0 | 1 |
| AI Discoverability Readiness | 15% | 7 | 5 (12) | 2 (3) | 1 | 1 | 1 |
| **Total** | **100%** | **44** | **38 (84)** | **6 (16)** | **12** | **4** | **3** |

*Type A weight 84 + Type B weight 16 = 100, which is also their share of the overall score: because
each dimension's weights sum to its dimension percentage (§1.1), one weight point is one overall
point everywhere in the rubric. The reviewer-dependent share of the assessed score is therefore
**16%**.*

### 21.3 Reviewer-assessed signals (Type B)

| ID | Dimension | Weight | What the reviewer decides |
|---|---|---:|---|
| CON-04 | Content | 4 | Which `L-ATTR-TEXT` attributes are stated in product text |
| CON-07 | Content | 5 | Which `L-INTENT` categories the site's content covers |
| ENT-04 | Entity | 3 | Whether what-is-sold, location and trading name are stated in text |
| ENT-10 | Entity | 1 | Whether credential claims appear as text or only as badge imagery |
| AID-01 | AI Disc | 1 | Whether informational pages answer before narrating |
| AID-02 | AI Disc | 2 | Which `L-FACT` members are in text, image-only, or absent |

All six default to `not_evaluated` without a reviewer record. None may be populated by a language
model (`engineering-rules.md` §4).

### 21.4 Unresolved `THRESHOLD-TBD`

**None.** All ten v0.1 `THRESHOLD-TBD` items were resolved, and no threshold was invented to do it:

| Resolution | Count | Signals |
|---|---:|---|
| Reformulated as a structural rule | 3 | CON-02, CON-03, ENT-03 |
| Demoted to informational | 4 | TEC-08, TEC-15, CON-06, CON-10 |
| Deferred | 3 | CON-08, CON-09, AID-10 |
| **Total** | **10** | |

AID-10's image-only component was additionally absorbed into AID-02, which is Type B — the honest
home for a judgement that cannot be made mechanically.

### 21.5 Major limitations of v1

1. **Weights remain a hypothesis.** They encode judgement about what matters for this segment. Nothing
   has yet been calibrated against outcomes. This is the largest single uncertainty in the rubric.
2. **16% of the assessed score is reviewer opinion**, concentrated in Content (9 of those 16 points). Disclosed by design,
   but reviewer consistency is unmeasured until the concierge batch produces repeat assessments.
3. **Everything is sample-bound.** No signal makes a claim about a site, only about the pages
   collected. This is stated everywhere but remains a real ceiling on what the audit can conclude.
4. **Declared lists are judgement in another form.** `L-INTENT` and `L-ATTR-TEXT` were chosen for the
   heritage-export segment from domain knowledge, not data. They are versioned and visible, which is
   better than hidden thresholds, but they are not validated.
5. **No third-party verification anywhere.** Declared entity data, credentials and external references
   are recorded as stated. The rubric never confirms them, and the report must never imply it did.
6. **AID-07 needs both render modes.** Without them the most consequential AI-extractability signal is
   `not_evaluated`, and 4 of 15 AI-dimension points go unmeasured.
7. **Type B signals make the assessed score non-reproducible across reviewers.** That is inherent, not
   a defect — it is why the deterministic score exists alongside it.

---

## 22. Open scoring questions

| # | Question | Current position |
|---|---|---|
| SQ-1 | Should `not_detected` score 0.0 or be excluded like `not_evaluated`? | **0.0.** Undiscoverable and absent are the same to a machine reader — but the wording differs (§4.1) |
| SQ-2 | Should dimension weights be segment-specific (export vs. domestic)? | **No** for v1. One rubric, one comparison basis. Revisit after calibration |
| SQ-3 | Is a coverage floor needed below which a dimension is unscored rather than low-confidence? | Currently coverage = 0 only. A higher floor should come from calibration data |
| SQ-4 | Integer or one decimal when shown to a customer? | One decimal internally; **integer to the customer**, to avoid implying precision the rubric lacks |
| SQ-5 | Should the headline number be the deterministic or the assessed score? | **Assessed when fully reviewed, deterministic otherwise** — both always shown (§3) |
| SQ-6 | Is 16% reviewer-dependent weight the right amount? | Unknown. Too low understates content quality; too high weakens the determinism claim. Test against reviewer consistency in the concierge batch |
| SQ-7 | Should AI Discoverability remain at 15%? | **Unchanged, flagged** (§19.3). Decide from evidence, not intuition |
| SQ-8 | How should `L-AIAGENT` be maintained as agents appear and disappear? | Versioned rubric data. Needs an explicit review cadence before the SaaS ships |
| SQ-9 | Do Type B signals need two reviewers to measure agreement? | Not for the concierge batch (one operator). Required before any Type B signal is calibrated into Type A |
