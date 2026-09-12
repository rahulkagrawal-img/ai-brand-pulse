# Fixtures

Synthetic evidence records used to develop and test the deterministic scoring engine.

| | |
|---|---|
| **Version** | 0.2 — aligned to Scoring Rubric v1.0 |
| **Schema** | `docs/audit-spec.md` |
| **Rubric** | `docs/scoring-rubric.md` v1.0 |

---

## What these are

Each file is a **scoring-engine input**: an evidence record in the shape defined by
`docs/audit-spec.md`, containing `metadata`, `site`, `crawl`, and the `evidence` block of each of the
five dimensions.

They contain **no signals and no scores**. Those are *outputs*. A fixture that carried a score would
be asserting the answer the engine is supposed to compute.

## What these are NOT

- **Not real websites.** Every domain is under `example.test` (reserved by RFC 6761 and guaranteed
  never to resolve). Every brand name is invented. No real prospect, customer or competitor site
  appears here.
- **Not scraped data.** Hand-written to exercise specific rule branches.
- **Not real-world audit results.** They are not representative of any actual brand, and no number
  derived from them may be quoted as an observation about anything.
- **Not exhaustive.** Three files cannot cover 44 scored signals. They are a starting corpus.

---

## The files

| File | Represents | Exercises |
|---|---|---|
| `minimal-valid-site.json` | A one-page brochure site with no catalogue | Structural minimum · `not_applicable` · dimension exclusion · weight redistribution · low coverage · single-page edge cases |
| `strong-site.json` | A well-implemented heritage-export ecommerce site | `pass` paths across all five dimensions · full structured-data coverage · both render modes (AID-07) · high coverage |
| `weak-site.json` | A commercially active but machine-illegible site | `fail` and `not_detected` paths · conflicting canonicals · `noindex` on a commercial page · unparseable structured data · review markup without visible reviews · facts trapped in images |

### Validation

Fixtures are validated against the evidence schema (`src/schema/evidence.ts`), which is the single
source of truth — TypeScript types are inferred from it, so types and validation rules cannot drift.

```
npm run validate:fixtures
```

The schema uses strict objects, so an undocumented key fails loudly rather than being ignored, and it
distinguishes a **`null` value** ("known to be absent") from a **missing key** ("not collected"), because
the `not_detected` / `not_evaluated` split depends on that difference (`audit-spec.md` §3).

### The `review` block

Each file carries a top-level `review` object (`audit-spec.md` §5b) holding reviewer records for
reviewer-populated evidence. `strong-site` and `weak-site` carry records for all six Type B signals;
`minimal-valid-site` carries none, so its Type B signals must resolve to `not_evaluated` and its
deterministic and assessed scores must be equal. That contrast is the point of having it empty.

### The `fixture` block

Each file carries a top-level `fixture` object that is **not part of the audit schema**. It records
the fixture's purpose and the behaviours it is meant to exercise. A loader strips it before passing
the record to the engine; a schema validator should reject it in a real audit record.

`expected_behaviour_notes` are prose intent, **not assertions**. Real assertions live in tests.

---

## Why no expected scores are committed yet

Writing `"expected_overall": 74.5` into a fixture before the engine exists would be inventing the
answer and then building something that reproduces it. Expected values are derived in two steps:

1. Assert **signal states** first. Those follow directly from the rubric and can be reasoned about by
   hand, one signal at a time.
2. Assert **scores** only once the signal states are agreed. At that point the score is arithmetic,
   and the expected value can be computed by hand from §3 of the rubric and committed as a
   regression baseline.

See `tests/README.md` §4.

---

## Alignment to Rubric v1.0

The three fixtures were first written against Rubric v0.1 and carried its vocabulary. Bringing them
onto the v1 evidence model was a set of meaning-preserving renames plus fields that v1 signals read
and v0.1 did not have:

| Change | Signal | Derived from |
|---|---|---|
| `legal_or_trading_name_stated` → `trading_name_stated` | ENT-04 | Field name in the locked rubric; value unchanged |
| intent `authenticity` → `authenticity_and_provenance` | CON-07 | `L-INTENT` member name |
| attribute keys `dimensions` → `size_or_dimensions`, `technique` → `pattern_or_technique` | PRD-09 | `L-ATTR-STRUCT` member names; values unchanged |
| `facts_image_only` dropped `dimensions` | AID-02 | Not a member of `L-FACT`, so AID-02 cannot score it |
| `collections[].body_text_present` added | CON-02 | Existing `has_intro_text` and `word_count` |
| `products[].name_present` added | PRD-01 | Existing `structured_data_present` / `parse_ok` |
| `products[].price_visible_in_text` added to `strong-site` | PRD-03 | Already true in `weak-site`; corroborated by `commercial_facts.price_in_text` |
| `duplication.templated_page_urls` added | CON-12 | Empty — no paginated variants in any sample |
| `entity.social_links_in_markup` added | ENT-07 | Existing `crawl.pages[].external_links` |
| `crawl.pages[].raw_html_contains` added | AID-07 | Existing `raw_html_text_length` vs `rendered_text_length` |
| `metadata.rubric_version` `0.1.0` → `1.0.0` | — | The fixture blocks already declared v1; metadata had not been updated |

`minimal-valid-site` deliberately **omits** `raw_html_contains`: its `render_mode` is `raw_html` only, so
the field was never collected. That exercises the "missing key → `not_evaluated`" path, which is the
distinction the whole state model rests on.

## Adding a fixture

1. Give it a name that says what it represents, not what it scores.
2. Use `example.test` domains and invented brand names. **Never** a real site, and never real
   prospect data (`docs/engineering-rules.md` §8).
3. Keep it minimal — include only the evidence the target branches need. A large fixture that
   exercises one branch makes failures hard to read.
4. State in `fixture.purpose` which rule branches it exists to reach.
5. Prefer several small, focused fixtures over one large realistic one. Realism is not the goal;
   branch coverage is.
6. Keep `metadata.as_of` fixed. A fixture whose expected output changes with the calendar is broken
   (`docs/engineering-rules.md` §3).

### Fixtures still needed

Not yet written; each targets branches the three current files do not reach:

- A site whose `robots.txt` blocks product paths (TEC-02 `fail`)
- A site with editorial content but no products (CON-* scored, all PRD-* `not_applicable`)
- A site with legitimate cross-domain canonicals (TEC-06 `fail` requiring human override)
- A multi-currency / multi-locale site (PRD-04 partial, locale limitation)
- A site with two or more unscored dimensions (`scores.issuable = false`)
- A site where `crawl.sought[]` omits a target that the site does in fact have, proving
  `not_evaluated` is returned rather than `not_detected` (rubric §4.4)
- A site with reviewer records on only some Type B signals, exercising a partial assessed score
- A site whose product text contains prompt-injection strings, to prove the scoring path is
  unaffected and that the string never reaches an instruction position
  (`docs/engineering-rules.md` §4)
