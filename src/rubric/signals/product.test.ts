/**
 * Product / AI Shopping Readiness signals — Layer 1 derivation tests (tests/README §3).
 *
 * One `describe` per signal, covering every reachable state and the rubric boundaries.
 * Expected states are hand-derived from `scoring-rubric.md` §12, never recorded from the
 * engine (tests/README §4). Each test builds minimal `ProductPageEvidence` from the
 * factory below — only the fields a signal reads are varied; the rest are innocuous
 * defaults.
 *
 * `not_applicable` is the empty-population state for every PRD signal (rubric §12 / §4.5),
 * so it is exercised per signal. `not_evaluated` is reachable only in PRD-04 (no priced
 * product); every signal is checked to never silently map `not_evaluated`/`not_applicable`
 * to zero (rubric §4.2/§4.3).
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProductPageEvidence, SoughtTarget } from '../../schema/evidence.ts';
import type { SignalResult } from '../signal.ts';
import { prd01, prd03, prd04, prd05, prd06, prd07, prd08, prd09, prd10, prd11, prd12 } from './product.ts';

/* ----------------------------------------------------------- factories --- */

type Offer = ProductPageEvidence['offer'];

function offer(overrides: Partial<Offer> = {}): Offer {
  return { price: null, price_currency: null, availability: null, ...overrides };
}

/** A minimal product page. Only the fields under test are overridden. */
function product(overrides: Partial<ProductPageEvidence> = {}): ProductPageEvidence {
  const { offer: offerOverride, ...rest } = overrides;
  return {
    url: 'https://brand.test/products/x',
    structured_data_present: false,
    parse_ok: false,
    offer: offer(offerOverride),
    sku: null,
    gtin: null,
    mpn: null,
    brand: null,
    variants: [],
    has_variant_selector: false,
    attributes: {},
    aggregate_rating: null,
    review_count: 0,
    reviews_visible_on_page: false,
    shipping_details: null,
    return_policy: null,
    ...rest,
  };
}

/** A page that passes PRD-01 (parseable named Product node). */
function namedProduct(overrides: Partial<ProductPageEvidence> = {}): ProductPageEvidence {
  return product({ structured_data_present: true, parse_ok: true, name_present: true, ...overrides });
}

const SOUGHT_POLICY: SoughtTarget[] = ['product', 'policy'];
const SOUGHT_NO_POLICY: SoughtTarget[] = ['product'];

function assertScoredRefs(result: SignalResult): void {
  ok(result.evidenceRefs.length > 0, 'evidence_refs must be non-empty for a scored/not_applicable state');
  ok(result.evidenceRefs.every((r) => r.startsWith('/')), 'evidence_refs must be JSON Pointers');
  ok(result.reason.length > 0, 'reason must be present');
}

function assertNotApplicable(result: SignalResult): void {
  strictEqual(result.state, 'not_applicable');
  strictEqual(result.itemsApplicable, 0);
  strictEqual(result.itemsEvaluated, 0);
  strictEqual(result.itemsSatisfying, 0);
  assertScoredRefs(result);
}

function assertNotEvaluated(result: SignalResult): void {
  strictEqual(result.state, 'not_evaluated');
  deepStrictEqual([...result.evidenceRefs], []);
}

/* --------------------------------------------------------------- PRD-01 --- */

describe('PRD-01 — product structured data present and parseable', () => {
  it('pass — every page has a parseable named Product node', () => {
    const r = prd01([namedProduct(), namedProduct()]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one page has a named node, one does not', () => {
    const r = prd01([namedProduct(), product({ structured_data_present: true, parse_ok: true, name_present: false })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    strictEqual(r.itemsEvaluated, 2);
    assertScoredRefs(r);
  });

  it('not_detected — data present but does not parse, or name absent', () => {
    strictEqual(prd01([product({ structured_data_present: true, parse_ok: false })]).state, 'not_detected');
    // name_present missing entirely is treated as absent (no not_evaluated for PRD-01).
    strictEqual(prd01([product({ structured_data_present: true, parse_ok: true })]).state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd01([]));
  });
});

/* --------------------------------------------------------------- PRD-03 --- */

describe('PRD-03 — price machine-readable', () => {
  it('pass — every page has a numeric price', () => {
    const r = prd03([product({ offer: offer({ price: 12500 }) }), product({ offer: offer({ price: 0 }) })]);
    strictEqual(r.state, 'pass'); // price 0 is a number → satisfies
    assertScoredRefs(r);
  });

  it('partial — one page priced, one not', () => {
    const r = prd03([product({ offer: offer({ price: 100 }) }), product({ offer: offer({ price: null }) })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no page exposes a structured price (visible-only price does not count)', () => {
    const r = prd03([product({ offer: offer({ price: null }), price_visible_in_text: true })]);
    strictEqual(r.state, 'not_detected'); // price_visible_in_text never alters the state
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd03([]));
  });
});

/* --------------------------------------------------------------- PRD-04 --- */

describe('PRD-04 — currency declared', () => {
  it('pass — every priced page declares a valid ISO 4217 code', () => {
    const r = prd04([product({ offer: offer({ price: 1, price_currency: 'INR' }) }), product({ offer: offer({ price: 2, price_currency: 'USD' }) })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one priced page valid, one invalid', () => {
    const r = prd04([product({ offer: offer({ price: 1, price_currency: 'EUR' }) }), product({ offer: offer({ price: 2, price_currency: 'Rupees' }) })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — priced pages exist but none declares a valid ISO code', () => {
    const r = prd04([product({ offer: offer({ price: 1, price_currency: 'zzz' }) })]);
    strictEqual(r.state, 'not_detected'); // lowercase/invalid is not an ISO 4217 code
  });

  it('population is priced pages only — an unpriced page with a currency is excluded', () => {
    // Page A priced+valid; page B unpriced but carries a currency string. Only A counts.
    const r = prd04([product({ offer: offer({ price: 1, price_currency: 'GBP' }) }), product({ offer: offer({ price: null, price_currency: 'GBP' }) })]);
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsEvaluated, 1);
  });

  it('not_evaluated — product pages exist but none carries a price', () => {
    assertNotEvaluated(prd04([product({ offer: offer({ price: null, price_currency: 'INR' }) })]));
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd04([]));
  });
});

/* --------------------------------------------------------------- PRD-05 --- */

describe('PRD-05 — availability declared', () => {
  it('pass — recognised enum values, bare token and schema.org URI form', () => {
    const r = prd05([product({ offer: offer({ availability: 'InStock' }) }), product({ offer: offer({ availability: 'https://schema.org/OutOfStock' }) })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one recognised, one not', () => {
    const r = prd05([product({ offer: offer({ availability: 'PreOrder' }) }), product({ offer: offer({ availability: 'maybe' }) })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no recognised availability value (case-sensitive)', () => {
    strictEqual(prd05([product({ offer: offer({ availability: 'instock' }) })]).state, 'not_detected');
    strictEqual(prd05([product({ offer: offer({ availability: null }) })]).state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd05([]));
  });
});

/* --------------------------------------------------------------- PRD-06 --- */

describe('PRD-06 — product identifier present', () => {
  it('pass — sku alone is a legitimate pass; gtin alone also passes', () => {
    strictEqual(prd06([product({ sku: 'SW-001' })]).state, 'pass');
    strictEqual(prd06([product({ gtin: '00012345600012' })]).state, 'pass');
  });

  it('partial — one page identified, one not', () => {
    const r = prd06([product({ sku: 'A' }), product({})]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no sku or gtin (mpn/product_id alone do not satisfy the GTIN-family rule)', () => {
    strictEqual(prd06([product({ sku: null, gtin: null })]).state, 'not_detected');
    strictEqual(prd06([product({ mpn: 'MPN-9', product_id: 'pid-9' })]).state, 'not_detected');
    strictEqual(prd06([product({ sku: '   ' })]).state, 'not_detected'); // blank is absent
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd06([]));
  });
});

/* --------------------------------------------------------------- PRD-07 --- */

describe('PRD-07 — brand declared on product', () => {
  it('pass — every page declares a brand', () => {
    strictEqual(prd07([product({ brand: 'Sacred Weaves' }), product({ brand: 'Other' })]).state, 'pass');
  });

  it('partial — one page has a brand, one does not', () => {
    const r = prd07([product({ brand: 'Sacred Weaves' }), product({ brand: null })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no page declares a brand', () => {
    strictEqual(prd07([product({ brand: null }), product({ brand: '  ' })]).state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd07([]));
  });
});

/* --------------------------------------------------------------- PRD-08 --- */

describe('PRD-08 — variants represented', () => {
  it('pass — every variant-bearing page exposes its variants', () => {
    const r = prd08([product({ has_variant_selector: true, variants: [{ size: 'S' }] })]);
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsEvaluated, 1);
    assertScoredRefs(r);
  });

  it('partial — one variant-bearing page exposes variants, another does not', () => {
    const r = prd08([
      product({ has_variant_selector: true, variants: [{ size: 'S' }] }),
      product({ has_variant_selector: true, variants: [] }),
    ]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    strictEqual(r.itemsEvaluated, 2);
  });

  it('not_detected — a variant-bearing page exposes no variants', () => {
    strictEqual(prd08([product({ has_variant_selector: true, variants: [] })]).state, 'not_detected');
  });

  it('population excludes pages without a selector', () => {
    // Only the selector page is in the population; the plain page never enters it.
    const r = prd08([product({ has_variant_selector: true, variants: [{ c: 'red' }] }), product({ has_variant_selector: false, variants: [] })]);
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsEvaluated, 1);
  });

  it('not_applicable — no sampled product offers variants', () => {
    assertNotApplicable(prd08([product({ has_variant_selector: false })]));
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd08([]));
  });
});

/* --------------------------------------------------------------- PRD-09 --- */

describe('PRD-09 — machine-readable product attributes (L-ATTR-STRUCT coverage)', () => {
  const allSix = {
    material: 'silk', colour: 'red', size_or_dimensions: '6m', weight: '500g',
    pattern_or_technique: 'brocade', origin: 'Varanasi',
  };

  it('pass — every L-ATTR-STRUCT member is structured on at least one page', () => {
    const r = prd09([product({ attributes: allSix })]);
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 6);
    strictEqual(r.itemsSatisfying, 6);
    assertScoredRefs(r);
  });

  it('coverage aggregates across pages — union of attributes counts', () => {
    const r = prd09([
      product({ attributes: { material: 'silk', colour: 'red' } }),
      product({ attributes: { origin: 'Varanasi' } }),
    ]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 3); // material, colour, origin
  });

  it('not_detected — no attribute is structured on any page (blank value is absent)', () => {
    strictEqual(prd09([product({ attributes: { material: '' } })]).state, 'not_detected');
    strictEqual(prd09([product({ attributes: {} })]).state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd09([]));
  });
});

/* --------------------------------------------------------------- PRD-10 --- */

describe('PRD-10 — review markup integrity', () => {
  it('pass — every page with visible reviews carries an aggregate rating', () => {
    const r = prd10([product({ reviews_visible_on_page: true, aggregate_rating: 4.6, review_count: 12 })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one visible-review page has a rating, another does not', () => {
    const r = prd10([
      product({ reviews_visible_on_page: true, aggregate_rating: 4.5, review_count: 5 }),
      product({ reviews_visible_on_page: true, aggregate_rating: null, review_count: 3 }),
    ]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    strictEqual(r.itemsEvaluated, 2);
  });

  it('fail — rating markup present with reviews not visible (violation), even absent any visible-review page', () => {
    const r = prd10([product({ reviews_visible_on_page: false, aggregate_rating: 4.9, review_count: 0 })]);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — violation beats an otherwise-passing page', () => {
    const r = prd10([
      product({ reviews_visible_on_page: true, aggregate_rating: 4.5, review_count: 10 }),
      product({ reviews_visible_on_page: false, aggregate_rating: 3.0, review_count: 0 }),
    ]);
    strictEqual(r.state, 'fail');
  });

  it('not_detected — reviews collected (review_count) but none represented as a visible rating', () => {
    const r = prd10([product({ reviews_visible_on_page: false, aggregate_rating: null, review_count: 7 })]);
    strictEqual(r.state, 'not_detected');
  });

  it('not_detected — visible reviews present but no rating markup on any page', () => {
    const r = prd10([product({ reviews_visible_on_page: true, aggregate_rating: null, review_count: 4 })]);
    strictEqual(r.state, 'not_detected');
  });

  it('not_applicable — site collects no reviews at all', () => {
    assertNotApplicable(prd10([product({ reviews_visible_on_page: false, aggregate_rating: null, review_count: 0 })]));
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd10([]));
  });
});

/* --------------------------------------------------------------- PRD-11 --- */

describe('PRD-11 — shipping terms machine-readable', () => {
  it('pass — every offer carries structured shipping terms', () => {
    const r = prd11([product({ shipping_details: { structured: true } })], false, SOUGHT_POLICY);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial (proportion) — one offer structured, one not', () => {
    const r = prd11([
      product({ shipping_details: { structured: true } }),
      product({ shipping_details: { structured: false } }),
    ], false, SOUGHT_POLICY);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('partial (policy upgrade) — no structured offer terms but a sought shipping policy page exists', () => {
    const r = prd11([product({ shipping_details: null })], true, SOUGHT_POLICY);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 0); // signal-declared partial, not from a proportion
    ok(r.evidenceRefs.includes('/entity/evidence/policies/shipping'));
    ok(r.evidenceRefs.includes('/crawl/sample/sought'));
  });

  it('not_detected — no structured offer terms and no shipping policy page', () => {
    strictEqual(prd11([product({ shipping_details: { structured: false } })], false, SOUGHT_POLICY).state, 'not_detected');
  });

  it('not_detected — policy exists but policy was not sought (gate closed, no upgrade)', () => {
    const r = prd11([product({ shipping_details: null })], true, SOUGHT_NO_POLICY);
    strictEqual(r.state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd11([], true, SOUGHT_POLICY));
  });
});

/* --------------------------------------------------------------- PRD-12 --- */

describe('PRD-12 — returns terms machine-readable', () => {
  it('pass — every offer carries a structured return policy', () => {
    strictEqual(prd12([product({ return_policy: { structured: true } })], false, SOUGHT_POLICY).state, 'pass');
  });

  it('partial (proportion) — one offer structured, one not', () => {
    const r = prd12([
      product({ return_policy: { structured: true } }),
      product({ return_policy: { structured: false } }),
    ], false, SOUGHT_POLICY);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('partial (policy upgrade) — no structured offer terms but a sought returns policy page exists', () => {
    const r = prd12([product({ return_policy: null })], true, SOUGHT_POLICY);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 0);
    ok(r.evidenceRefs.includes('/entity/evidence/policies/returns'));
  });

  it('not_detected — no structured offer terms and no returns policy page', () => {
    strictEqual(prd12([product({ return_policy: { structured: false } })], false, SOUGHT_POLICY).state, 'not_detected');
  });

  it('not_detected — policy exists but policy was not sought', () => {
    strictEqual(prd12([product({ return_policy: null })], true, SOUGHT_NO_POLICY).state, 'not_detected');
  });

  it('not_applicable — no product pages', () => {
    assertNotApplicable(prd12([], true, SOUGHT_POLICY));
  });
});

/* ---------------------------------------------------- cross-cutting checks --- */

describe('PRD signals — evidence-ref discipline and determinism', () => {
  const page = namedProduct({
    offer: offer({ price: 999, price_currency: 'INR', availability: 'InStock' }),
    sku: 'SW-1', brand: 'Sacred Weaves', has_variant_selector: true, variants: [{ size: 'M' }],
    attributes: { material: 'silk' }, reviews_visible_on_page: true, aggregate_rating: 4.7, review_count: 20,
    shipping_details: { structured: true }, return_policy: { structured: true },
  });

  it('every scored result carries JSON-Pointer refs rooted at /product or /entity or /crawl', () => {
    const results = [
      prd01([page]), prd03([page]), prd04([page]), prd05([page]), prd06([page]),
      prd07([page]), prd08([page]), prd09([page]), prd10([page]),
      prd11([page], true, SOUGHT_POLICY), prd12([page], true, SOUGHT_POLICY),
    ];
    for (const r of results) {
      assertScoredRefs(r);
      ok(r.evidenceRefs.every((ref) => /^\/(product|entity|crawl)\//.test(ref)), `unexpected ref root in ${r.reason}`);
    }
  });

  it('the same input scores identically twice (determinism)', () => {
    deepStrictEqual(prd04([page]), prd04([page]));
    deepStrictEqual(prd10([page]), prd10([page]));
    deepStrictEqual(prd11([page], true, SOUGHT_POLICY), prd11([page], true, SOUGHT_POLICY));
  });

  it('no PRD signal maps not_applicable to a zero score (state stays not_applicable)', () => {
    const results = [
      prd01([]), prd03([]), prd04([]), prd05([]), prd06([]),
      prd07([]), prd08([]), prd09([]), prd10([]),
      prd11([], false, SOUGHT_POLICY), prd12([], false, SOUGHT_POLICY),
    ];
    for (const r of results) strictEqual(r.state, 'not_applicable');
  });
});
