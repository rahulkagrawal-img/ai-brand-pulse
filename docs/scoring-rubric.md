# AI Brand Pulse — Scoring Rubric

| | |
|---|---|
| **Document** | `docs/scoring-rubric.md` (canonical) |
| **Version** | 0.1 — **provisional, uncalibrated** |
| **Date** | 12 September 2026 |
| **Status** | Specification for Milestone 1. Signal weights and all numeric thresholds are provisional and must be recalibrated after the ~20 concierge audits |
| **Implements** | The five-dimension model in `product-brief.md` §4 and `validation-plan.md` §7 |

> **Read this first.** This rubric defines *how a score is computed*, not *what a good site looks
> like*. Several signals below deliberately leave the threshold unspecified, because the methodology
> has not been validated. An unspecified threshold is recorded here as `THRESHOLD-TBD` and the signal
> is scored `not_evaluated` until a threshold is set from real audit data. **Inventing a precise
> threshold to make the engine look finished is a failure, not a shortcut.**

---

## 1. The five dimensions

| Code | Dimension | Weight |
|---|---|---:|
| `technical` | Technical SEO | 20% |
| `content` | Content & Topical Authority | 25% |
| `entity` | Entity & Trust | 20% |
| `product` | Product / AI Shopping Readiness | 20% |
| `ai_discoverability` | AI Discoverability Readiness | 15% |

```text
Overall = technical × 0.20
        + content × 0.25
        + entity × 0.20
        + product × 0.20
        + ai_discoverability × 0.15
```

Dimension weights are **fixed** for v0.1 and are a product decision, not an engineering one. They are
not to be tuned to make scores look better.

---

## 2. Signal states

Every signal resolves to exactly one of six states. This vocabulary is closed — no signal may
introduce a seventh.

| State | Meaning | Numeric value | In denominator? |
|---|---|---:|---|
| `pass` | The evidence satisfies the rule | **1.0** | Yes |
| `partial` | The evidence partly satisfies the rule | **0.5** | Yes |
| `fail` | Evidence was found and it does **not** satisfy the rule | **0.0** | Yes |
| `not_detected` | The evidence was looked for in the collected material and was **absent** | **0.0** | Yes |
| `not_applicable` | The rule does not apply to this site | — | **No** — excluded |
| `not_evaluated` | The evidence could not be collected, or no validated threshold exists yet | — | **No** — excluded, and lowers confidence |

### The distinction that matters most

`fail`, `not_detected` and `not_evaluated` are three different statements and must never be collapsed:

- **`fail`** — "We found the Product schema and it has no price."
- **`not_detected`** — "We examined the product pages we collected and found no returns information."
- **`not_evaluated`** — "We could not determine this from the evidence available."

`not_detected` scores zero because absence of a discoverable signal *is* the visibility problem the
product measures — a machine reader that cannot find the returns policy is in the same position as
one for which it does not exist. But `not_detected` is **never** rendered to a customer as a factual
claim about their business. It is rendered as:

> *Not detected in the pages reviewed.*

Never as *"You have no returns policy."* The site may well have one; it was not discoverable in the
evidence collected. This phrasing rule is not cosmetic — it is the difference between an honest
diagnostic and a fabricated claim. See `engineering-rules.md` §2.

`not_evaluated` scores *nothing at all* — it is removed from the denominator — because scoring an
unmeasured thing as zero would silently punish a site for a limitation of the audit.

---

## 3. Scoring mathematics

### 3.1 Signal → dimension

Each signal carries an integer **weight** within its dimension (1 = standard, 2 = important,
3 = critical). Dimension score:

```text
applicable = { signals in dimension where state ∈ {pass, partial, fail, not_detected} }

                 Σ (weight_s × value_s)   for s ∈ applicable
dimension_raw =  ────────────────────────────────────────────
                 Σ (weight_s)             for s ∈ applicable

dimension_score = round_half_up(dimension_raw × 100, 1)     # 0.0 – 100.0
```

Signals in state `not_applicable` or `not_evaluated` appear in neither the numerator nor the
denominator. This is **weight redistribution**: the remaining signals proportionally absorb the
excluded weight.

### 3.2 Dimension → overall

```text
overall_score = round_half_up(
    Σ (dimension_score_d × dimension_weight_d) for d ∈ scored_dimensions, 1
)
```

### 3.3 Coverage and confidence

Redistribution is the honest way to handle missing evidence, but it must be **disclosed**, or a site
scoring 100 on one evaluated signal looks identical to a site scoring 100 on fifteen.

```text
                Σ (weight_s) for s ∈ applicable
coverage_d =    ──────────────────────────────────────────────
                Σ (weight_s) for s ∈ dimension, excluding not_applicable
```

| Coverage | Confidence label | Handling |
|---|---|---|
| ≥ 0.80 | `high` | Report normally |
| 0.50 – 0.79 | `medium` | Report, with a visible coverage note |
| 0.01 – 0.49 | `low` | Report, but the dimension score must carry an explicit low-confidence warning in every rendering |
| 0 | `unscored` | Dimension is **unscored**: excluded from the overall calculation, its weight redistributed across the remaining dimensions, and the exclusion stated on the report |

When every signal in a dimension is `not_applicable`, the coverage denominator is zero. Coverage is
then defined as **0** and the dimension is `unscored` — the engine must handle this case explicitly
rather than dividing by zero. The `product` dimension on a site with no product pages is the ordinary
case, not an edge case.

An audit in which **two or more dimensions are unscored** must not be issued as a finished audit.
It is an incomplete evidence collection, and saying so is the correct output.

### 3.4 Determinism requirements

Given byte-identical evidence input, the engine must return a byte-identical score object. That
requires:

1. **No wall-clock, locale, timezone or random input** in scoring. Anything time-relative (content
   freshness) is computed against an `as_of` timestamp **supplied in the evidence**, never from the
   system clock.
2. **No network, filesystem, database or LLM access** inside the scoring path.
3. **No iteration-order dependence.** Signals are evaluated in a fixed, declared order; any grouping
   over evidence collections sorts by an explicit key first.
4. **Rounding applied once, at the end of each defined step**, using round-half-away-from-zero — not
   banker's rounding, whose behaviour differs between languages and would make the same rubric score
   differently in two implementations.
5. **Floating-point discipline.** Weighted sums are computed over integer weights and a fixed set of
   values {0, 0.5, 1}, which are exactly representable in binary floating point, so the arithmetic
   is exact up to the final division. Implementations must not introduce other fractional values.

See `engineering-rules.md` §3 and `tests/README.md`.

---

## 4. How to read a signal definition

Every signal specifies:

- **ID** — stable, never reused, never renumbered.
- **Measures** — what the signal is a measurement *of*.
- **Evidence** — the path in the evidence record it reads. It may read **nothing else**.
- **States** — the subset of the six states this signal can produce.
- **Scoring** — the deterministic rule mapping evidence to state.
- **Weight** — 1–3, within its dimension.
- **Limits** — what the signal does *not* establish. This field is mandatory and is the basis of the
  `limitations` section of every audit.

Notation: `THRESHOLD-TBD` marks a value that must come from calibration data. `sampled pages` means
the pages present in `crawl.pages`, never the site as a whole.

---

## 5. Technical SEO — 20%

*Can search and AI systems reach, parse and correctly index the site?*

Total weight: 28 points across 15 signals.

#### TEC-01 — robots.txt retrievable
- **Measures:** whether a `robots.txt` exists and is served at the origin root.
- **Evidence:** `crawl.robots_txt.{fetched, status_code, body}`
- **States:** `pass` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — HTTP 200 with a parseable body. `not_detected` — HTTP 404/410, or 200 with an empty body. `not_evaluated` — fetch failed (timeout, DNS, 5xx).
- **Weight:** 1
- **Limits:** Presence says nothing about correctness. A missing `robots.txt` is not itself harmful — most crawlers treat it as "allow all" — so this signal is weighted low and exists mainly to establish whether TEC-02 can be evaluated at all.

#### TEC-02 — robots.txt does not block key paths
- **Measures:** whether crawl directives exclude paths the brand needs indexed.
- **Evidence:** `crawl.robots_txt.rules`, `crawl.pages[].url`, `site.key_paths`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — no `Disallow` rule matches any sampled product, collection, About, Contact or policy URL for `User-agent: *`. `partial` — a rule blocks non-commercial paths only (search, cart, account). `fail` — a rule blocks sampled product or collection URLs, or `Disallow: /` applies to `*`. `not_evaluated` — TEC-01 is `not_detected` or `not_evaluated`.
- **Weight:** 3
- **Limits:** Rule matching follows the common prefix/wildcard convention; real crawler behaviour on ambiguous or conflicting rules varies by vendor. Agent-specific blocks are recorded here for `*` only; per-agent directives are reported factually under AID-08.

#### TEC-03 — XML sitemap discoverable
- **Measures:** whether a sitemap can be found by a machine without guessing.
- **Evidence:** `crawl.sitemaps[]`, `crawl.robots_txt.sitemap_directives`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — at least one sitemap is declared in `robots.txt` **and** retrievable and well-formed. `partial` — retrievable at a conventional location but not declared in `robots.txt`, or declared but malformed. `not_detected` — none found at declared or conventional locations.
- **Weight:** 2
- **Limits:** Only locations actually requested are covered; a sitemap at an unconventional undeclared path is indistinguishable from no sitemap, which is precisely the discoverability problem being measured.

#### TEC-04 — Sitemap covers key page types
- **Measures:** whether the sitemap represents the commercially important parts of the site.
- **Evidence:** `crawl.sitemaps[].urls`, `crawl.pages[].{url, page_type}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — every sampled product and collection URL appears in a sitemap. `partial` — some appear. `fail` — none appear although sitemaps were retrieved and non-empty. `not_evaluated` — TEC-03 did not yield a retrievable sitemap.
- **Weight:** 1
- **Limits:** Measured against *sampled* pages only. This is a coverage proxy, not a completeness audit of the catalogue; a sitemap may legitimately omit pages this audit never saw, and the inverse is not detectable from a sample.

#### TEC-05 — Sampled pages are indexable
- **Measures:** whether pages that should be indexed are permitted to be.
- **Evidence:** `crawl.pages[].{meta_robots, x_robots_tag, page_type, status_code}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — no sampled commercial page (home, collection, product, About, Contact, policy, editorial) carries `noindex` in a meta robots tag or `X-Robots-Tag` header. `partial` — `noindex` appears only on pages where it is conventionally appropriate (search results, cart, account, filtered/faceted URLs). `fail` — any sampled commercial page carries `noindex`.
- **Weight:** 3
- **Limits:** Covers only directives observable in HTML and response headers on sampled pages. Does not cover rendering-time directive injection, Search Console-level exclusions, or actual index status — **this signal does not establish whether a page is in any index**, only whether it is permitted to be.

#### TEC-06 — Canonical tags present and self-consistent
- **Measures:** whether the site tells machines which URL is authoritative.
- **Evidence:** `crawl.pages[].{url, canonical_url, canonical_count}`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — every sampled page declares exactly one canonical, resolving to an absolute URL on the site's own host. `partial` — canonicals present on some sampled pages, or some resolve to a different-but-plausible on-site URL. `fail` — multiple conflicting canonicals on one page, or canonicals pointing off-host, or all pages canonicalised to the homepage. `not_detected` — no canonical tag on any sampled page.
- **Weight:** 2
- **Limits:** Cross-domain canonicals may be intentional (syndication) and are reported as `fail` with the evidence attached for human review — this is a signal where human override is expected and permitted.

#### TEC-07 — Title tags present and unique
- **Measures:** whether every sampled page carries a distinct title.
- **Evidence:** `crawl.pages[].{url, title}`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — every sampled page has a non-empty title and all titles are distinct. `partial` — all present, but duplicates exist across distinct pages. `fail` — one or more sampled pages have an empty title while others have one. `not_detected` — no sampled page has a title.
- **Weight:** 2
- **Limits:** Duplicate detection is over sampled pages only. Exact-string comparison after whitespace normalisation; near-duplicates are not detected.

#### TEC-08 — Title tag construction
- **Measures:** whether titles are constructed to be useful to a machine reader (descriptive, not truncated, brand-consistent).
- **Evidence:** `crawl.pages[].title`, `site.brand_name`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD`. Length bands and brand-token rules must be set from calibration data. **Until then this signal is `not_evaluated`.**
- **Weight:** 1
- **Limits:** Title "quality" is the weakest kind of signal in this rubric — pixel-width truncation varies by surface and language, and no length rule is defensible across Devanagari and Latin titles without measurement. Deliberately left unscored rather than guessed.

#### TEC-09 — Meta descriptions present and unique
- **Measures:** whether pages supply a summary machines can use.
- **Evidence:** `crawl.pages[].{url, meta_description}`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — every sampled page has a non-empty, distinct meta description. `partial` — present on most sampled pages, or duplicated across pages. `fail` — present on a minority of sampled pages. `not_detected` — absent from all sampled pages.
- **Weight:** 1
- **Limits:** Meta descriptions do not affect ranking and are weighted accordingly. They matter here because they are frequently reused as machine-readable summaries.

#### TEC-10 — Heading structure
- **Measures:** whether document structure is expressed semantically.
- **Evidence:** `crawl.pages[].headings[]` (level, text, order)
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — every sampled page has exactly one `h1`, and heading levels descend without skipping more than one level. `partial` — one `h1` per page but levels skip, or a small minority of pages deviate. `fail` — pages with multiple `h1`s or with headings used purely for visual styling. `not_detected` — no headings found on sampled pages.
- **Weight:** 2
- **Limits:** Structural only. A well-formed heading tree says nothing about whether the content beneath it is useful — that is CON-*'s job.

#### TEC-11 — Internal linking
- **Measures:** whether sampled pages are reachable and interlinked rather than isolated.
- **Evidence:** `crawl.pages[].{url, internal_links[], depth_from_home}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — every sampled commercial page is reachable from the homepage within the crawl depth, and each has at least one inbound internal link from another sampled page. `partial` — some sampled pages have no inbound internal link within the sample. `fail` — sampled product or collection pages are reachable only via the sitemap. `not_evaluated` — fewer than 3 pages sampled.
- **Weight:** 2
- **Limits:** "Orphan" here means *orphan within the sample*, which is not the same as orphan on the site. The distinction must be stated in the finding text. Links injected client-side are invisible unless the evidence includes rendered HTML.

#### TEC-12 — Structured data present and parseable
- **Measures:** whether the site emits machine-readable structured data at all, and whether it parses.
- **Evidence:** `crawl.pages[].structured_data[]` (`format`, `types`, `parse_ok`, `raw`)
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — structured data found on sampled pages and **all** blocks parse. `partial` — found and some blocks fail to parse. `fail` — found but no block parses. `not_detected` — no structured data on any sampled page.
- **Weight:** 3
- **Limits:** This is a *syntactic* check — does it parse, and what types are declared. Whether the declared types are correct or complete is scored by ENT-01/02 and PRD-01..09. Parseability is not validity against a vocabulary specification; this rubric does not run a schema validator.

#### TEC-13 — HTTPS and host canonicalisation
- **Measures:** whether the site resolves to one secure, consistent origin.
- **Evidence:** `crawl.origin.{scheme, redirect_chain, hsts}`, `crawl.pages[].url`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — HTTPS served, and HTTP and the non-preferred host variant both redirect to the single preferred origin in one hop. `partial` — HTTPS served but variant handling is inconsistent or multi-hop. `fail` — HTTP served without redirect, or certificate errors recorded, or both host variants serve 200.
- **Weight:** 2
- **Limits:** Certificate chain validity is recorded as observed at collection time and is not re-verified at scoring time.

#### TEC-14 — Mobile viewport declared
- **Measures:** whether the site declares a responsive viewport.
- **Evidence:** `crawl.pages[].viewport_meta`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — a viewport meta tag with a `width` directive on all sampled pages. `partial` — on some. `not_detected` — on none.
- **Weight:** 1
- **Limits:** A declared viewport is a necessary, wholly insufficient condition for mobile usability. **This signal must never be reported as "the site is mobile-friendly."**

#### TEC-15 — Performance signals
- **Measures:** observable page-weight and render-blocking characteristics.
- **Evidence:** `crawl.pages[].{html_bytes, resource_counts, render_blocking_counts}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD`. **`not_evaluated` in v0.1.**
- **Weight:** 2
- **Limits:** Real performance (Core Web Vitals) is **field data** about real users on real devices and networks. It cannot be derived from HTML, and synthetic lab numbers collected once from one location are not it. This signal stays unscored until a genuine data source is connected — and if one is, the audit must name it. Reporting a fabricated performance grade would breach the positioning constraint in `product-brief.md` §8 exactly as surely as inventing a ranking would.

---

## 6. Content & Topical Authority — 25%

*Does the site contain enough substantive, related content for a machine to understand what this
brand is about and to answer buyers' questions from it?*

Total weight: 22 points across 12 signals. Highest-weighted dimension — for heritage and export
brands, content depth is usually the binding constraint.

#### CON-01 — Category/collection structure
- **Measures:** whether the catalogue is organised into machine-visible categories.
- **Evidence:** `crawl.pages[].page_type`, `content.collections[]`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `pass` — two or more distinct collection pages, each linked from primary navigation. `partial` — collection pages exist but are not in primary navigation, or only one exists. `fail` — products are reachable only from a single flat listing. `not_detected` — no collection pages in the sample.
- **Weight:** 2
- **Limits:** Navigation membership is read from the markup; mega-menus rendered client-side may be invisible without rendered evidence.

#### CON-02 — Category page descriptive content
- **Measures:** whether collection pages explain the category or are bare product grids.
- **Evidence:** `content.collections[].{word_count, has_intro_text}`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD` for the word-count band. Until calibrated: `pass` — every sampled collection page carries non-boilerplate descriptive prose; `partial` — some do; `not_detected` — none do.
- **Weight:** 2
- **Limits:** Presence of prose is not quality of prose. Boilerplate detection is limited to exact repetition across collection pages.

#### CON-03 — Product description depth
- **Measures:** whether product pages carry substantive text a machine can extract facts from.
- **Evidence:** `content.products[].{description_word_count, description_text_present}`
- **States:** `pass` · `partial` · `fail` · `not_detected`
- **Scoring:** `THRESHOLD-TBD` for word-count bands. Until calibrated: `pass` — all sampled product pages have descriptive text beyond a title and price; `partial` — some do; `not_detected` — none do.
- **Weight:** 3
- **Limits:** Word count is a proxy for substance and a poor one. For heritage products, a 60-word description naming weave, region, fibre and care may be more machine-useful than 400 words of atmosphere — which is exactly why the threshold is left for calibration rather than guessed. CON-04 measures the attribute content directly and should be trusted over this signal where they disagree.

#### CON-04 — Product attribute narrative
- **Measures:** whether the descriptive text states the attributes a buyer and a machine need — material, dimensions, craft/technique, origin, care.
- **Evidence:** `content.products[].attributes_in_text[]`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — sampled product pages state four or more distinct attribute categories in text. `partial` — one to three. `not_detected` — none.
- **Weight:** 3
- **Limits:** Attribute presence is detected as declared in the evidence record; the extractor's recall bounds this signal. Attributes stated **only in images** are not machine-readable and are correctly counted as absent — that is a finding, not an extraction error, and should be reported as such.

#### CON-05 — Informational content hub
- **Measures:** whether the site has any editorial/informational section.
- **Evidence:** `content.editorial.{hub_present, hub_url}`
- **States:** `pass` · `not_detected`
- **Scoring:** `pass` — a blog, journal, guides or resources section is discoverable. `not_detected` — none.
- **Weight:** 2
- **Limits:** Binary presence only. Depth is CON-06 and CON-09.

#### CON-06 — Informational content volume
- **Measures:** how much editorial content exists.
- **Evidence:** `content.editorial.article_count`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD` for the count bands. `not_evaluated` until calibrated, unless `article_count == 0`, in which case `not_detected`.
- **Weight:** 1
- **Limits:** Count is not quality; ten thin posts are not two good guides. Bands must be set from what actually correlated with problem resonance in concierge audits.

#### CON-07 — Buyer-intent coverage
- **Measures:** whether content answers the questions buyers ask before purchase — how to choose, sizing/fit, care, authenticity, comparison, shipping and duties for export buyers.
- **Evidence:** `content.intent_coverage[]` (intent category → pages)
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — four or more distinct buyer-intent categories covered by at least one page each. `partial` — one to three. `not_detected` — none.
- **Weight:** 3
- **Limits:** The intent taxonomy is fixed in the evidence schema and is segment-specific (see `audit-spec.md` §5.4). Categorisation of a page to an intent is a **derived signal with a human-review flag** — it is the least mechanical judgement in this dimension.

#### CON-08 — Topical breadth
- **Measures:** how many distinct subject areas the site's content covers.
- **Evidence:** `content.topics[]` (topic label → page count)
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD`. `not_evaluated` until the topic taxonomy and bands are calibrated.
- **Weight:** 1
- **Limits:** Topic assignment is not reliably deterministic if it is derived by a language model — and if it is derived by a language model it is **not evidence**. Until a deterministic topic-labelling method is defined (fixed taxonomy + keyword rules) or topics are assigned by a human reviewer, this stays unscored. See `engineering-rules.md` §4.

#### CON-09 — Topical depth
- **Measures:** whether any topic is covered by a cluster of related pages rather than a single page.
- **Evidence:** `content.topics[].page_count`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD`. `not_evaluated` until calibrated. Depends on CON-08's taxonomy.
- **Weight:** 1
- **Limits:** As CON-08.

#### CON-10 — Content freshness
- **Measures:** whether content carries dates and whether anything has been published or updated recently.
- **Evidence:** `content.editorial.articles[].{published_at, modified_at}`, `metadata.as_of`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD` for the recency window. Until calibrated: `pass` — dates are present and machine-readable on editorial content; `partial` — dates present in prose only; `not_detected` — no dates.
- **Weight:** 1
- **Limits:** **Recency is computed against `metadata.as_of` from the evidence record, never the system clock** — otherwise the same evidence would score differently tomorrow and break determinism (§3.4). Freshness also matters far less for heritage/craft content than for news; the recency window must reflect that and must not be inherited from generic SEO advice.

#### CON-11 — Internal content relationships
- **Measures:** whether editorial and commercial content are linked to each other.
- **Evidence:** `content.editorial.articles[].internal_links[]`, `content.products[].inbound_editorial_links`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — editorial pages link to relevant product/collection pages **and** at least one commercial page links back to editorial. `partial` — links run one way only. `not_detected` — no links between the two. `not_evaluated` — CON-05 is `not_detected`.
- **Weight:** 2
- **Limits:** Link *relevance* is not assessed — a link from a care guide to an unrelated product counts the same as a well-targeted one.

#### CON-12 — Thin and duplicate content indicators
- **Measures:** observable duplication or near-emptiness across sampled pages.
- **Evidence:** `content.duplication.{exact_duplicate_groups, empty_body_pages}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — no sampled page has an empty main body and no exact-duplicate body text across distinct URLs. `partial` — duplication confined to paginated or filtered variants. `fail` — distinct commercial pages share identical body text.
- **Weight:** 1
- **Limits:** Exact matching after whitespace normalisation only. Near-duplicate detection (shingling, embeddings) is deliberately out of scope for v0.1 — it introduces a similarity threshold with no validated basis, and an embedding-based method would not be reproducible across model versions, violating §3.4.

---

## 7. Entity & Trust — 20%

*Can a machine determine who this brand is, that it is a real business, and that it is the same
entity wherever it appears?*

Total weight: 22 points across 11 signals.

#### ENT-01 — Organization structured data present
- **Measures:** whether the brand declares itself as a machine-readable entity.
- **Evidence:** `crawl.pages[].structured_data[]` where `types` includes `Organization` or a subtype.
- **States:** `pass` · `not_detected`
- **Scoring:** `pass` — an `Organization` (or subtype, e.g. `OnlineStore`, `LocalBusiness`) node is present and parses on at least one sampled page. `not_detected` — none.
- **Weight:** 3
- **Limits:** Presence only; completeness is ENT-02.

#### ENT-02 — Organization schema completeness
- **Measures:** whether the declared entity carries the properties that make it resolvable — `name`, `url`, `logo`, `description`, `contactPoint`, `address`, `sameAs`.
- **Evidence:** the `Organization` node's properties.
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — `name`, `url`, `logo` and at least two of {`description`, `contactPoint`, `address`, `sameAs`}. `partial` — `name` plus at least one other. `fail` — `name` only, or `name` absent. `not_evaluated` — ENT-01 is `not_detected`.
- **Weight:** 3
- **Limits:** Property presence is checked, not property *truth*. A `logo` URL is not fetched or verified to render; an `address` is not verified to exist. **The audit must never state or imply that declared entity data has been verified.**

#### ENT-03 — About page present and substantive
- **Measures:** whether the brand explains itself in prose.
- **Evidence:** `entity.about.{url, present, word_count}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — an About/Our Story page is discoverable and carries substantive prose. `partial` — present but minimal or template boilerplate. `not_detected` — no About page found in the sample.
- **Weight:** 2
- **Limits:** Word-count band is `THRESHOLD-TBD`; until calibrated, "substantive" means more than a single paragraph, assessed by the extractor and **flagged for human review**.

#### ENT-04 — Business identity clarity
- **Measures:** whether a machine reading the homepage and About page can state what the business is, what it sells, and where it operates from.
- **Evidence:** `entity.identity.{what_sold_stated, location_stated, legal_or_trading_name_stated}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — all three stated explicitly in text. `partial` — one or two. `not_detected` — none.
- **Weight:** 3
- **Limits:** "Stated explicitly in text" means present as extractable text, not implied by imagery or brand knowledge. A heritage brand whose Varanasi origin is obvious to any Indian reader but appears nowhere in text scores `not_detected` on that component — **and that is the finding**, not an extraction failure.

#### ENT-05 — Contact information completeness
- **Measures:** whether contact details are discoverable and machine-readable.
- **Evidence:** `entity.contact.{page_present, email, phone, postal_address, contact_form}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — a contact page plus at least two of {email, phone, postal address} as text. `partial` — a contact form or a single channel only. `not_detected` — no contact information found.
- **Weight:** 2
- **Limits:** Contact details rendered only as images, or behind JavaScript-only widgets, are counted as absent. Obfuscation is often deliberate anti-spam practice — the finding should say "not machine-readable", not "missing".

#### ENT-06 — Identity consistency across the site
- **Measures:** whether the brand name, address and contact details agree wherever they appear.
- **Evidence:** `entity.consistency.{name_variants[], address_variants[], phone_variants[]}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — one normalised variant of each present across schema, footer and contact page. `partial` — minor formatting variance only. `fail` — materially different values in different places. `not_evaluated` — fewer than two occurrences to compare.
- **Weight:** 2
- **Limits:** **On-site consistency only.** This signal does **not** check directory listings, marketplace profiles or any third-party source; consistency across the wider web is not measured and must not be claimed.

#### ENT-07 — External entity references (`sameAs`)
- **Measures:** whether the site links itself to its own profiles elsewhere.
- **Evidence:** `entity.same_as[]` (URLs declared in `Organization.sameAs` and social links in markup).
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — two or more external profile URLs declared in `sameAs`. `partial` — social links present in markup but not declared in `sameAs`. `not_detected` — neither.
- **Weight:** 2
- **Limits:** **Declared, not verified.** The linked profiles are not fetched, not confirmed to exist, and not confirmed to belong to this brand. The evidence statement is "the site declares these references", and the report must say exactly that.

#### ENT-08 — Author / expert attribution
- **Measures:** whether editorial content carries identifiable authorship.
- **Evidence:** `entity.authorship.{articles_with_author, author_entities[]}`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Scoring:** `pass` — editorial content carries named authors with a resolvable author page or `Person` schema. `partial` — names without supporting entity data. `not_detected` — no attribution. `not_applicable` — CON-05 is `not_detected` (no editorial content exists to attribute).
- **Weight:** 1
- **Limits:** Applies to editorial content only. Authorship carries different weight in different categories and this rubric does not attempt to model that; weighted low accordingly.

#### ENT-09 — Trust and policy pages
- **Measures:** whether the commercial trust framework is present and discoverable.
- **Evidence:** `entity.policies.{privacy, terms, returns, shipping, refunds}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — four or more of the five policy types discoverable as distinct pages. `partial` — one to three. `not_detected` — none.
- **Weight:** 2
- **Limits:** Existence and discoverability only. Policy **content** is not read, assessed or judged adequate, and the audit must not imply otherwise.

#### ENT-10 — Credential and certification claims
- **Measures:** whether the site states credentials (certification marks, council memberships, export registrations) in machine-readable text.
- **Evidence:** `entity.credentials[]` (claim text, source URL, image-only flag)
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — credential claims present as extractable text with supporting detail. `partial` — present as image or logo only, or as an unexplained badge. `not_detected` — none found.
- **Weight:** 1
- **Limits:** **This signal records that a claim is made. It never verifies the claim.** No certification register is consulted. Every rendering must read "the site states…" — an audit that implies a certification has been confirmed would be exactly the fabrication the product exists to avoid. For a Silk Mark or Handloom Mark claim, the correct output is *"stated on the product page; not independently verified by this audit."*

#### ENT-11 — Brand naming consistency in metadata
- **Measures:** whether the brand name is used consistently across titles, schema and logo alt text.
- **Evidence:** `site.brand_name`, `crawl.pages[].title`, `Organization.name`, `entity.logo_alt`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — one normalised brand token across all three sources. `partial` — consistent in two of three. `fail` — three different forms. `not_evaluated` — ENT-01 `not_detected` and no titles available.
- **Weight:** 1
- **Limits:** Normalisation is case- and punctuation-insensitive. Legitimate variation (legal entity name vs. trading name) will present as `partial` and is a case where **human override is expected**.

---

## 8. Product / AI Shopping Readiness — 20%

*Can an AI shopping system read this catalogue — what is sold, at what price, whether it is
available, and under what terms?*

Total weight: 28 points across 14 signals. All product signals are `not_applicable` if the site has
no product pages (see §10.2).

#### PRD-01 — Product structured data present
- **Measures:** whether product pages emit machine-readable product data at all.
- **Evidence:** `product.pages[].structured_data` where `types` includes `Product`.
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — every sampled product page carries a parseable `Product` node. `partial` — some do. `not_detected` — none do.
- **Weight:** 3
- **Limits:** Presence only. Everything below measures what is inside it.

#### PRD-02 — Product schema parses and is well-formed
- **Measures:** whether the emitted product data parses and carries a name.
- **Evidence:** `product.pages[].structured_data.parse_ok`, `required_property_errors[]`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — all `Product` nodes parse and carry `name`. `partial` — some parse. `fail` — present but none parse. `not_evaluated` — PRD-01 `not_detected`.
- **Weight:** 2
- **Limits:** Parseability and a `name` property — **not** validation against the full vocabulary specification, and not a prediction of whether any specific platform will accept the markup.

#### PRD-03 — Price present
- **Measures:** whether a price is present in structured data, not merely visible to a human.
- **Evidence:** `product.pages[].offer.price`, `product.pages[].price_visible_in_text`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — a numeric price on every sampled product's offer. `partial` — on some. `not_detected` — on none, or price appears in visible text only.
- **Weight:** 3
- **Limits:** Price in visible HTML but absent from structured data scores `not_detected` here **by design** — the signal measures machine-readability, not whether a human can see a price. The finding must say so explicitly, or it reads as an obvious falsehood to the customer.

#### PRD-04 — Currency declared
- **Measures:** whether the currency of each price is unambiguously declared.
- **Evidence:** `product.pages[].offer.price_currency`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — a valid ISO 4217 code on every sampled offer. `partial` — on some, or present but not a valid code. `not_detected` — absent. `not_evaluated` — PRD-03 `not_detected`.
- **Weight:** 2
- **Limits:** Especially consequential for export brands: an undeclared currency makes a price ambiguous to any cross-border system. Multi-currency sites serving different currencies by geography cannot be fully assessed from a single-locale collection — record the collection locale in `metadata` and state the limitation.

#### PRD-05 — Availability declared
- **Measures:** whether purchasability is declared in a machine-readable form.
- **Evidence:** `product.pages[].offer.availability`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — a recognised availability enum value on every sampled offer. `partial` — on some, or a non-standard value. `not_detected` — absent.
- **Weight:** 2
- **Limits:** Declared availability is a snapshot at collection time and is not reconciled against any inventory source.

#### PRD-06 — Product identifiers
- **Measures:** whether products carry a stable identifier a machine can key on.
- **Evidence:** `product.pages[].{sku, gtin, mpn, product_id}`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — `sku` **or** a GTIN-family identifier on every sampled product. `partial` — on some. `not_detected` — on none.
- **Weight:** 2
- **Limits:** Identifier **presence**, not validity — no checksum validation, no registry lookup. GTINs are frequently inapplicable to handmade and one-of-a-kind heritage products; `sku` alone is a legitimate `pass` and the rubric is written that way deliberately.

#### PRD-07 — Brand declared on product
- **Measures:** whether each product declares the brand it belongs to.
- **Evidence:** `product.pages[].brand`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — a `brand` property on every sampled product. `partial` — on some. `not_detected` — on none.
- **Weight:** 1
- **Limits:** Not checked for agreement with `site.brand_name` — multi-brand retailers are legitimate.

#### PRD-08 — Variants represented
- **Measures:** whether purchasable variants are exposed to machines, not only to the storefront UI.
- **Evidence:** `product.pages[].variants[]`, `has_variant_selector`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Scoring:** `pass` — products with a variant selector expose variants in structured data. `partial` — a selector exists but variants are not in structured data. `not_detected` — neither. `not_applicable` — no sampled product offers variants.
- **Weight:** 2
- **Limits:** Variant *sets* are not checked for completeness against the storefront; only what is declared is read.

#### PRD-09 — Machine-readable product attributes
- **Measures:** whether product attributes are structured properties rather than prose or imagery.
- **Evidence:** `product.pages[].attributes{}` (material, colour, size, dimensions, weight, pattern, technique, origin)
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — three or more attributes present as structured properties on sampled products. `partial` — one or two. `not_detected` — none (attributes in prose only, or absent).
- **Weight:** 3
- **Limits:** Attributes present in prose but not as structured properties score `not_detected` **here** and are separately credited under CON-04. The two signals are intentionally different measurements of the same underlying fact and both must be read to state the finding correctly.

#### PRD-10 — Review and rating markup
- **Measures:** whether reviews that exist are represented in structured data — and whether markup exists without them.
- **Evidence:** `product.pages[].{aggregate_rating, review_count, reviews_visible_on_page}`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Scoring:** `pass` — reviews visible on page **and** represented in structured data. `partial` — visible but not marked up. `not_detected` — neither. `not_applicable` — the site collects no reviews.
- **Weight:** 2
- **Limits:** **Review markup without corresponding visible reviews is a policy violation on major platforms and must be reported as a risk, not as a pass.** If `aggregate_rating` is present and `reviews_visible_on_page` is false, the state is `fail` and the finding says why. The audit never assesses whether reviews are genuine.

#### PRD-11 — Shipping information machine-readable
- **Measures:** whether shipping terms are machine-readable rather than buried in a policy page.
- **Evidence:** `product.pages[].shipping_details`, `entity.policies.shipping`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — shipping terms in structured data on offers. `partial` — a shipping policy page exists but terms are not structured. `not_detected` — neither.
- **Weight:** 2
- **Limits:** High relevance for export brands, where shipping terms and duties are often the deciding purchase factor and are almost never machine-readable. The distinction between "has a policy" and "policy is machine-readable" must survive into the report.

#### PRD-12 — Returns information machine-readable
- **Measures:** whether returns terms are machine-readable rather than buried in a policy page.
- **Evidence:** `product.pages[].return_policy`, `entity.policies.returns`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** As PRD-11.
- **Weight:** 2
- **Limits:** As PRD-11.

#### PRD-13 — Product taxonomy and breadcrumbs
- **Measures:** whether each product's place in the catalogue is expressed in a machine-readable form.
- **Evidence:** `product.pages[].{breadcrumb_list, category}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — `BreadcrumbList` structured data on sampled product pages. `partial` — visible breadcrumb navigation without markup, or a `category` property only. `not_detected` — neither.
- **Weight:** 1
- **Limits:** Breadcrumb *accuracy* relative to site structure is not assessed.

#### PRD-14 — Product imagery machine-readable
- **Measures:** whether product imagery is associated with the product in a machine-readable way.
- **Evidence:** `product.pages[].{image_urls[], images_with_alt, image_in_structured_data}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — product images declared in structured data **and** carrying descriptive alt text. `partial` — one of the two. `not_detected` — neither.
- **Weight:** 1
- **Limits:** Alt text is checked for presence and non-triviality (not empty, not the filename); it is not assessed for descriptive quality.

---

## 9. AI Discoverability Readiness — 15%

*Can a machine system extract facts from this site and reproduce them accurately in an answer?*

Total weight: 20 points across 10 signals.

> **Scope statement, which must appear verbatim in every audit rendering this dimension:**
> *This dimension measures readiness and answerability from observable evidence. It does not measure,
> and does not claim to measure, whether this brand appears in or is cited by ChatGPT, Gemini,
> Perplexity, Google AI Overviews or any other AI system.*

#### AID-01 — Answer-first content structure
- **Measures:** whether informational content states its answer where a machine will find it.
- **Evidence:** `ai.answerability.{pages_with_lead_answer, question_headings[]}`
- **States:** `pass` · `partial` · `not_detected` · `not_evaluated`
- **Scoring:** `pass` — informational pages state the answer near the top, under a question-form or directly descriptive heading. `partial` — some do. `not_detected` — none do. `not_evaluated` — no informational pages sampled.
- **Weight:** 2
- **Limits:** Detection is structural — heading form and position of a declarative passage. It cannot assess whether the answer is *correct*. Heading-form detection is language-dependent and unvalidated for non-English content; record the content language and state the limitation.

#### AID-02 — Explicit facts in text
- **Measures:** whether the facts that matter exist as text a machine can extract.
- **Evidence:** `ai.facts.{facts_in_text[], facts_image_only[]}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — key commercial and brand facts (what is sold, materials, origin, price, delivery terms) appear as extractable text. `partial` — some appear as text, others only in images. `not_detected` — key facts are image-only or absent.
- **Weight:** 3
- **Limits:** Very common failure for visually-led heritage brands, where craft, provenance and care information lives entirely in lookbook imagery. No OCR is performed and none should be — the point is precisely that machine readers do not have the fact.

#### AID-03 — FAQ content and markup
- **Measures:** whether question-and-answer content exists and is marked up as such.
- **Evidence:** `ai.faq.{faq_pages[], faqpage_schema_present}`
- **States:** `pass` · `partial` · `not_detected` · `not_applicable`
- **Scoring:** `pass` — FAQ content exists **and** carries `FAQPage` structured data. `partial` — FAQ content without markup, or markup without substantive content. `not_detected` — neither.
- **Weight:** 2
- **Limits:** Rich-result eligibility for FAQ markup has been narrowed by search platforms and varies over time; the value scored here is machine-extractability of question/answer pairs, **not** an implied rich result. Do not promise rich results in a recommendation derived from this signal.

#### AID-04 — Entity clarity for extraction
- **Measures:** whether a machine can state, from text alone, who this brand is and what it sells.
- **Evidence:** `ai.entity_clarity.{brand_statement_present, category_statement_present}`, ENT-04
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — a plain-text statement identifying the brand and what it sells exists on the homepage or About page. `partial` — implied but not stated. `not_detected` — neither.
- **Weight:** 2
- **Limits:** Overlaps ENT-04 deliberately — the same underlying evidence matters in two dimensions for different reasons (trust vs. extractability). This is an intentional, documented correlation, not a double-count error; both dimensions would be incomplete without it.

#### AID-05 — Structured information coverage
- **Measures:** how much of the site's information is expressed in structured form at all.
- **Evidence:** `ai.schema_types[]` (distinct types across sampled pages)
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — three or more distinct meaningful types across the site (e.g. `Organization`, `Product`, `BreadcrumbList`, `FAQPage`, `Article`). `partial` — one or two. `not_detected` — none.
- **Weight:** 2
- **Limits:** Breadth, not correctness. `WebSite` and `WebPage` alone do not count toward "meaningful" — the list is fixed in the evidence schema so the count is reproducible.

#### AID-06 — Semantic relationships
- **Measures:** whether relationships between entities and pages are expressed explicitly.
- **Evidence:** `ai.relationships.{breadcrumbs_present, entity_links_present, about_mentions_present}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — two or more relationship mechanisms present (breadcrumbs, `isPartOf`/`mainEntity`, `about`/`mentions`, internal entity links). `partial` — one. `not_detected` — none.
- **Weight:** 1
- **Limits:** Presence of the mechanism, not the correctness of the relationships expressed.

#### AID-07 — Content available without client-side rendering
- **Measures:** whether content is present without executing client-side code.
- **Evidence:** `crawl.pages[].{raw_html_text_length, rendered_text_length}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `pass` — substantive body text is present in the raw HTML response. `partial` — some content requires rendering. `fail` — raw HTML carries essentially no body text. `not_evaluated` — only one of the two collection modes was performed.
- **Weight:** 3
- **Limits:** Requires both raw and rendered collection to be scored at all; with one mode only it is honestly `not_evaluated`. Some AI crawlers execute JavaScript and some do not, and which do changes over time — the finding should describe the risk, never assert that a specific named system cannot see the content.

#### AID-08 — Crawl directives affecting AI agents
- **Measures:** what the site declares to AI and assistant user agents.
- **Evidence:** `crawl.robots_txt.agent_rules{}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** Factual record. `pass` — no directives block known AI/assistant user agents. `partial` — some blocked, some allowed. `fail` — the site blocks AI agents broadly **and** the brand's stated objective is AI visibility. `not_evaluated` — no `robots.txt`.
- **Weight:** 1
- **Limits:** **This is a record of what the site declares, not a recommendation.** Blocking AI agents may be a deliberate and legitimate commercial choice, particularly for brands whose designs are copied. The finding presents the fact and its consequence; it does not tell the brand to unblock, and the `fail` state requires a stated objective to conflict with — which is a human-supplied input, not an inference.

#### AID-09 — Commercial facts as text
- **Measures:** whether the commercial facts a buyer asks about exist as extractable text.
- **Evidence:** `ai.commercial_facts.{price_in_text, shipping_in_text, returns_in_text}`
- **States:** `pass` · `partial` · `not_detected`
- **Scoring:** `pass` — price, shipping and returns information all present as extractable text. `partial` — one or two. `not_detected` — none.
- **Weight:** 2
- **Limits:** Complements PRD-03/11/12, which measure *structured* representation. A site can pass here and fail there, and both facts belong in the report.

#### AID-10 — Content extractability
- **Measures:** whether page structure lets a machine extract content reliably.
- **Evidence:** `ai.extractability.{semantic_html_ratio, tabular_data_as_tables, text_in_images_flag}`
- **States:** `pass` · `partial` · `fail` · `not_evaluated`
- **Scoring:** `THRESHOLD-TBD` for the semantic-HTML ratio. Until calibrated: `pass` — specification tables are real tables and key content is not image-only; `partial` — mixed; `fail` — key content is predominantly in images.
- **Weight:** 2
- **Limits:** Ratio-based sub-signals are unscored until calibrated; the image-only component is scored as it is directly observable.

---

## 10. Cross-cutting rules

### 10.1 Sampling

Every signal is evaluated over `crawl.pages` — the pages actually collected — and **never** over "the
site". The audit records `crawl.sample` (page count, depth, selection method, collection timestamp,
locale) and every rendering states it. A site with 4,000 products assessed from 25 pages is a
**sample**, and the report says so.

### 10.2 Applicability

| Condition | Effect |
|---|---|
| No product pages in the sample | All `PRD-*` → `not_applicable`; the `product` dimension is unscored and its 20% redistributed (§3.3) |
| No editorial content | CON-06, CON-09, CON-10, CON-11, ENT-08, AID-01 → `not_applicable` or `not_evaluated` as specified per signal |
| Single-page site | TEC-07 and TEC-09 uniqueness components → `not_applicable`; TEC-11 → `not_evaluated` |
| No reviews collected | PRD-10 → `not_applicable` |

Applicability is determined **from evidence**, never from assumption about the brand.

### 10.3 Weight calibration status

All signal weights in v0.1 are **judgement, not measurement**. They encode which signals the founder
believes matter most for this segment. After the concierge batch, recalibrate against:

1. Which findings produced problem resonance (H2).
2. Which findings customers actually acted on (H4 supporting metric).
3. Which signals discriminated between sites and which were constant across all of them — a signal
   that returns the same state for every site measures nothing and should be dropped, whatever its
   intuitive appeal.

Any weight change is a rubric version bump and invalidates score comparability across versions.
See §11.

### 10.4 Human override

A human reviewer may override any derived signal state. Overrides are **recorded, never silent**:
the original derived state, the override state, the reviewer and the reason are all stored
(`audit-spec.md` §7). An audit with overrides reports its score as **reviewed**, and the override
log is the single most valuable artefact the concierge phase produces — it is the list of everywhere
the deterministic rules were wrong.

### 10.5 What the score is not

The overall score is a **readiness measurement against this rubric**. It is not a prediction of
traffic, rankings, revenue or AI citations, it is not comparable to any third-party score, and it is
not comparable across rubric versions. Every rendering states the rubric version alongside the score.

---

## 11. Versioning

Every scored audit records `scoring.rubric_version`. A change to any weight, threshold, state mapping
or signal definition is a version bump. Scores from different versions are **not comparable** and must
not be trended against each other. Signal IDs are permanent: a retired signal is marked retired, never
deleted and never reused.

---

## 12. Auditability requirement

For any score the engine produces, it must be possible to answer, mechanically and without
re-running a crawl:

1. Which signals contributed, in which states, at which weights.
2. Which evidence path produced each state.
3. Which signals were excluded, and under which state and reason.
4. What the coverage and confidence were, per dimension.
5. Which rubric version was applied.
6. Which states, if any, were overridden by a human, by whom and why.

If any of those cannot be answered from the stored audit record, the score is not auditable and the
implementation is incomplete — regardless of whether the number is correct.

---

## 13. Open scoring questions

| # | Question | Current default |
|---|---|---|
| SQ-1 | Should `not_detected` score 0.0 or be excluded like `not_evaluated`? | **0.0.** Undiscoverable and absent are the same thing to a machine reader — but the *wording* differs (§2) |
| SQ-2 | Should dimension weights be segment-specific (export vs. domestic)? | **No** for v0.1. One rubric, one comparison basis. Revisit after calibration |
| SQ-3 | Is a floor needed below which a dimension is unscored rather than low-confidence? | Currently coverage = 0 only. A higher floor should be set from calibration data |
| SQ-4 | Should the overall score be an integer or one decimal? | One decimal internally; **integer when shown to a customer**, to avoid implying precision the rubric does not have |
| SQ-5 | How many `THRESHOLD-TBD` signals may be `not_evaluated` before an audit is not issuable? | Undecided. The §3.3 rule (two unscored dimensions) is the only current guard |
| SQ-6 | Do AID-04/ENT-04 and PRD-09/CON-04 overlaps need explicit de-duplication? | **No** — documented as intentional (§9 AID-04, §8 PRD-09). Revisit if calibration shows the pairs never diverge |
