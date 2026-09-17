/**
 * Product / AI Shopping Readiness — the eleven scored signals (Scoring Rubric v1.0 §12).
 *
 * All eleven are Type A (deterministic): everything here is a property of markup, not a
 * matter of opinion (rubric §12). Each function is a PURE derivation: evidence in,
 * `SignalResult` out (audit-spec §7.2, Phase 3 planning D-1). No network, no clock, no
 * LLM, no dependency beyond the §6 aggregation primitive and the declared schema types
 * (engineering-rules §3).
 *
 * **Population and the catalogue guard.** Every PRD signal's population is the sampled
 * product pages (`product.pages[]`). Per rubric §12 and §4.5, all PRD scored signals are
 * `not_applicable` when the sample contains no product pages — the aggregation rule
 * already returns `not_applicable` for A == 0, and the guards below surface it with the
 * observed ref. This module produces only the deterministic effect of the §4.5 guard
 * (signals `not_applicable`, dimension unscored); the mandatory critical finding and the
 * headline-adjacency rule are a later milestone (§4.5 "Milestone 1 scope").
 *
 * Most signals delegate their state to `aggregateItems` (rubric §6.2). Three carry
 * additional, rubric-declared structure that the bare proportion cannot express:
 *   - PRD-04 distinguishes "no product pages" (`not_applicable`) from "product pages but
 *     none priced" (`not_evaluated`, PRD-04 Limits);
 *   - PRD-10 has a population-level violation (rating markup without visible reviews) and
 *     its own `not_applicable` ("no reviews collected at all", PRD-10 Limits);
 *   - PRD-11/PRD-12 upgrade the zero state to `partial` when a policy page exists but the
 *     terms are not structured on the offer (PRD-11/12 Limits), sought-gated on `policy`
 *     per §4.4. This partial is declared by the signal definition, not derived from a
 *     proportion of items (see the note on each function).
 *
 * `evidence_refs` are JSON Pointers (RFC 6901) into the audit record (D-2), non-empty for
 * every state except `not_evaluated` (audit-spec §7.2). Product evidence lives under
 * `/product/evidence/pages/…`; PRD-11/12 additionally read `/entity/evidence/policies/…`
 * and `/crawl/sample/sought`.
 */

import type { AggregationResult } from '../aggregation.ts';
import { aggregateItems, type PopulationItem } from '../aggregation.ts';
import type { SignalResult } from '../signal.ts';
import { L_ATTR_STRUCT } from '../lists.ts';
import type { ProductPageEvidence, SoughtTarget } from '../../schema/evidence.ts';

/* ------------------------------------------------------------- helpers --- */

/** RFC 6901 JSON Pointer from path segments (D-2). Escapes `~` and `/` per the spec. */
function ptr(...segments: (string | number)[]): string {
  return '/' + segments.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

/** `not_evaluated` result: could not be checked. Evidence refs are empty (audit-spec §7.2). */
function notEvaluated(reason: string): SignalResult {
  return { state: 'not_evaluated', itemsApplicable: 0, itemsEvaluated: 0, itemsSatisfying: 0, evidenceRefs: [], reason };
}

/**
 * `not_applicable` result: the rule genuinely does not apply (rubric §4.3). Excluded
 * from numerator, denominator and coverage. Carries evidence refs (the absence it is
 * derived from is itself observed), per audit-spec §7.2.
 */
function notApplicable(evidenceRefs: string[], reason: string): SignalResult {
  return { state: 'not_applicable', itemsApplicable: 0, itemsEvaluated: 0, itemsSatisfying: 0, evidenceRefs, reason };
}

function scored(agg: AggregationResult, evidenceRefs: string[], reason: string): SignalResult {
  return { ...agg, evidenceRefs, reason };
}

/**
 * Reason text for a multi-item aggregate. The `partial` case states the proportion from
 * the recorded counts; those are data, not scoring thresholds.
 */
function reasonFor(agg: AggregationResult, thing: string, pass: string, zero: string, fail = zero): string {
  switch (agg.state) {
    case 'pass': return pass;
    case 'partial': return `${agg.itemsSatisfying} of ${agg.itemsEvaluated} ${thing}`;
    case 'fail': return fail;
    default: return zero; // not_detected zero state
  }
}

/** A present-and-non-empty string (a `null`/`undefined`/blank field is absent). */
function nonEmpty(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/** `product.pages[i].<field>` JSON Pointer. */
function pageRef(i: number, ...field: (string | number)[]): string {
  return ptr('product', 'evidence', 'pages', i, ...field);
}

/**
 * ISO 4217 alphabetic currency codes — transcribed from the ISO 4217 standard the
 * rubric names for PRD-04 ("a valid ISO 4217 code"). This is authoritative external
 * data, not an invented threshold: like ENT-01's schema.org tokens it is the exact set
 * the rubric points at. The active alphabetic codes are listed, including the fund and
 * supranational codes (X-series) and precious metals, because those are part of the
 * standard; the rubric asks for "a valid ISO 4217 code", not a subset judgement. The
 * standard is versioned externally (a code change is a data change, not a code change).
 */
const ISO_4217_CODES: ReadonlySet<string> = new Set([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV',
  'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHE', 'CHF',
  'CHW', 'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE',
  'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD',
  'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD',
  'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD',
  'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD',
  'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA',
  'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MXV',
  'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB',
  'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB',
  'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS',
  'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND',
  'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'USN', 'UYI',
  'UYU', 'UYW', 'UZS', 'VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XAG',
  'XAU', 'XBA', 'XBB', 'XBC', 'XBD', 'XCD', 'XDR', 'XOF', 'XPD', 'XPF',
  'XPT', 'XSU', 'XTS', 'XUA', 'XXX', 'YER', 'ZAR', 'ZMW', 'ZWL',
]);

/** `price_currency` is a valid ISO 4217 code (PRD-04). Exact, case-sensitive membership. */
function isIso4217(code: string | null): boolean {
  return code !== null && ISO_4217_CODES.has(code);
}

/**
 * schema.org `ItemAvailability` enumeration members — transcribed from schema.org, the
 * vocabulary Product/offer markup uses. PRD-05's "a recognised enum value" is this set.
 */
const ITEM_AVAILABILITY: ReadonlySet<string> = new Set([
  'BackOrder', 'Discontinued', 'InStock', 'InStoreOnly', 'LimitedAvailability',
  'MadeToOrder', 'OnlineOnly', 'OutOfStock', 'PreOrder', 'PreSale', 'Reserved', 'SoldOut',
]);

/**
 * `availability` is a recognised `ItemAvailability` value (PRD-05). schema.org
 * enumeration members are canonically URIs (`https://schema.org/InStock`); the bare
 * token (`InStock`) is the shorthand. Both forms are accepted by stripping an optional
 * `schema.org/` prefix, then matching the member set exactly. This recognises the
 * standard enum in either form; it is not a widening of the rule.
 */
function isRecognisedAvailability(value: string | null): boolean {
  if (value === null) return false;
  const token = value.replace(/^https?:\/\/schema\.org\//i, '').replace(/^schema\.org\//i, '');
  return ITEM_AVAILABILITY.has(token);
}

/* --------------------------------------------------------------- PRD-01 --- */

/**
 * PRD-01 — Product structured data present and parseable (§12). Population: sampled
 * product pages. A page satisfies when it carries a `Product` node that parses and has a
 * non-empty `name` (`structured_data_present` && `parse_ok` && `name_present`). No
 * violation; zero state `not_detected`. `not_applicable` when there are no product pages.
 * States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd01(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: p.structured_data_present && p.parse_ok && p.name_present === true,
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; product structured data does not apply');
  }
  const refs = pages.flatMap((_, i) => [pageRef(i, 'structured_data_present'), pageRef(i, 'parse_ok'), pageRef(i, 'name_present')]);
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages carry a parseable named Product node', 'every sampled product page carries a parseable Product node with a non-empty name', 'no sampled product page carries a parseable Product node with a non-empty name'),
  );
}

/* --------------------------------------------------------------- PRD-03 --- */

/**
 * PRD-03 — Price machine-readable (§12). Population: sampled product pages. A page
 * satisfies when `offer.price` is a number. `price_visible_in_text` is read ONLY to
 * phrase the finding and never alters the state (PRD-03 Limits), so it is not consulted
 * here. No violation; zero state `not_detected`. `not_applicable` when there are no
 * product pages. States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd03(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: typeof p.offer.price === 'number',
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; machine-readable price does not apply');
  }
  const refs = pages.map((_, i) => pageRef(i, 'offer', 'price'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages expose a price in structured data', 'every sampled product page exposes a price in structured data', 'no sampled product page exposes a price in structured data'),
  );
}

/* --------------------------------------------------------------- PRD-04 --- */

/**
 * PRD-04 — Currency declared (§12). Population: sampled product pages **with a price in
 * structured data**. A page satisfies when `offer.price_currency` is a valid ISO 4217
 * code. No violation; zero state `not_detected`.
 *
 * Two distinct empty cases, per the rubric: `not_applicable` when there are no product
 * pages (the dimension does not apply, §4.5); `not_evaluated` when there are product
 * pages but none carries a price (PRD-04 Limits — there is no price for a currency to
 * qualify). States: `pass` · `partial` · `not_detected` · `not_applicable` · `not_evaluated`.
 */
export function prd04(pages: readonly ProductPageEvidence[]): SignalResult {
  if (pages.length === 0) {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; currency declaration does not apply');
  }
  const priced = pages.map((p, i) => ({ p, i })).filter(({ p }) => typeof p.offer.price === 'number');
  if (priced.length === 0) {
    return notEvaluated('no sampled product page carries a price; currency could not be evaluated');
  }
  const items: PopulationItem[] = priced.map(({ p }) => ({
    applicable: true,
    evaluable: true,
    satisfying: isIso4217(p.offer.price_currency),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = priced.map(({ i }) => pageRef(i, 'offer', 'price_currency'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'priced product pages declare a valid ISO 4217 currency', 'every priced product page declares a valid ISO 4217 currency', 'no priced product page declares a valid ISO 4217 currency'),
  );
}

/* --------------------------------------------------------------- PRD-05 --- */

/**
 * PRD-05 — Availability declared (§12). Population: sampled product pages. A page
 * satisfies when `offer.availability` is a recognised `ItemAvailability` enum value. No
 * violation; zero state `not_detected`. `not_applicable` when there are no product pages.
 * States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd05(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: isRecognisedAvailability(p.offer.availability),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; availability declaration does not apply');
  }
  const refs = pages.map((_, i) => pageRef(i, 'offer', 'availability'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages declare a recognised availability value', 'every sampled product page declares a recognised availability value', 'no sampled product page declares a recognised availability value'),
  );
}

/* --------------------------------------------------------------- PRD-06 --- */

/**
 * PRD-06 — Product identifier present (§12). Population: sampled product pages. A page
 * satisfies when `sku` or a GTIN-family identifier (`gtin`) is present and non-empty
 * (PRD-06 "sku or any GTIN-family identifier"; `sku` alone is a legitimate pass). No
 * violation; zero state `not_detected`. `not_applicable` when there are no product pages.
 * States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd06(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: nonEmpty(p.sku) || nonEmpty(p.gtin),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; product identifiers do not apply');
  }
  const refs = pages.flatMap((_, i) => [pageRef(i, 'sku'), pageRef(i, 'gtin')]);
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages carry a SKU or GTIN identifier', 'every sampled product page carries a SKU or GTIN identifier', 'no sampled product page carries a SKU or GTIN identifier'),
  );
}

/* --------------------------------------------------------------- PRD-07 --- */

/**
 * PRD-07 — Brand declared on product (§12). Population: sampled product pages. A page
 * satisfies when `brand` is present and non-empty. Not checked for agreement with
 * `site.brand_name` (PRD-07 Limits). No violation; zero state `not_detected`.
 * `not_applicable` when there are no product pages. States: `pass` · `partial` ·
 * `not_detected` · `not_applicable`.
 */
export function prd07(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: nonEmpty(p.brand),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; brand declaration does not apply');
  }
  const refs = pages.map((_, i) => pageRef(i, 'brand'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages declare a brand', 'every sampled product page declares a brand', 'no sampled product page declares a brand'),
  );
}

/* --------------------------------------------------------------- PRD-08 --- */

/**
 * PRD-08 — Variants represented (§12). Population: sampled product pages **where
 * `has_variant_selector` is true**. A page satisfies when `variants[]` is non-empty. No
 * violation; zero state `not_detected`. `not_applicable` when no sampled product offers
 * variants (PRD-08 Limits) — including when there are no product pages at all; both are
 * A == 0. States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd08(pages: readonly ProductPageEvidence[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: p.has_variant_selector === true,
    evaluable: true,
    satisfying: p.variants.length > 0,
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product page offers variants; variant representation does not apply');
  }
  const refs = pages.flatMap((p, i) =>
    p.has_variant_selector === true ? [pageRef(i, 'variants'), pageRef(i, 'has_variant_selector')] : [],
  );
  return scored(
    agg,
    refs,
    reasonFor(agg, 'variant-bearing product pages expose their variants to machines', 'every variant-bearing product page exposes its variants to machines', 'no variant-bearing product page exposes its variants to machines'),
  );
}

/* --------------------------------------------------------------- PRD-09 --- */

/**
 * PRD-09 — Machine-readable product attributes (§12). Population: `L-ATTR-STRUCT` (6
 * members), assessed across sampled product pages. An attribute satisfies when it is
 * present as a structured property on at least one sampled product page. No violation;
 * zero state `not_detected`. `not_applicable` when there are no product pages (§4.5). A
 * declared-list signal (§6.4). States: `pass` · `partial` · `not_detected` ·
 * `not_applicable`.
 */
export function prd09(pages: readonly ProductPageEvidence[]): SignalResult {
  if (pages.length === 0) {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; product attributes do not apply');
  }
  const items: PopulationItem[] = L_ATTR_STRUCT.map((attr) => ({
    applicable: true,
    evaluable: true,
    satisfying: pages.some((p) => nonEmpty(p.attributes[attr])),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = pages.map((_, i) => pageRef(i, 'attributes'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-ATTR-STRUCT attributes are structured on sampled product pages', 'every L-ATTR-STRUCT attribute is structured on at least one sampled product page', 'no L-ATTR-STRUCT attribute is structured on any sampled product page'),
  );
}

/* --------------------------------------------------------------- PRD-10 --- */

/**
 * PRD-10 — Review markup integrity (§12). Population: sampled product pages **with
 * reviews visible on the page**. A page satisfies when reviews are visible AND an
 * `aggregate_rating` is present.
 *
 * **Violation (population-level):** any sampled product page where `aggregate_rating` is
 * present and `reviews_visible_on_page` is false — rating markup without visible reviews
 * is a policy violation and is reported as a risk, never a pass. Because such a page is
 * OUTSIDE the visible-reviews population, the violation is evaluated across all product
 * pages and forces `fail` directly rather than through `aggregateItems` (whose §6.2 rule
 * only consults a violation once the population is non-empty).
 *
 * `not_applicable` when there are no product pages, or when the site collects no reviews
 * at all (no page has visible reviews, an aggregate rating, or a review count) — PRD-10
 * Limits. When reviews are collected but none is represented as a visible review with a
 * rating, the state is `not_detected`. Zero state `not_detected`. States: `pass` ·
 * `partial` · `fail` · `not_detected` · `not_applicable`.
 */
export function prd10(pages: readonly ProductPageEvidence[]): SignalResult {
  if (pages.length === 0) {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no sampled product pages; review markup does not apply');
  }
  const collectsReviews = pages.some(
    (p) => p.reviews_visible_on_page === true || p.aggregate_rating !== null || p.review_count > 0,
  );
  if (!collectsReviews) {
    return notApplicable([ptr('product', 'evidence', 'pages')], 'no reviews are collected on any sampled product page; review markup does not apply');
  }

  const refs = pages.map((_, i) => pageRef(i));
  const violation = pages.some((p) => p.aggregate_rating !== null && p.reviews_visible_on_page === false);
  const visible = pages.filter((p) => p.reviews_visible_on_page === true);

  if (violation) {
    return {
      state: 'fail',
      itemsApplicable: visible.length,
      itemsEvaluated: visible.length,
      itemsSatisfying: visible.filter((p) => p.aggregate_rating !== null).length,
      evidenceRefs: refs,
      reason: 'a sampled product page carries aggregate rating markup without any visible reviews',
    };
  }

  const items: PopulationItem[] = visible.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: p.aggregate_rating !== null,
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    // Reviews are collected (guarded above) but none is visible on a page: the visible
    // population is empty, so there is nothing to represent — checked and absent.
    return { state: 'not_detected', itemsApplicable: 0, itemsEvaluated: 0, itemsSatisfying: 0, evidenceRefs: refs, reason: 'reviews are collected but none is represented as a visible review with aggregate rating markup' };
  }
  return scored(
    agg,
    refs,
    reasonFor(agg, 'product pages with visible reviews carry aggregate rating markup', 'every sampled product page with visible reviews carries aggregate rating markup', 'no sampled product page with visible reviews carries aggregate rating markup'),
  );
}

/* --------------------------------------------------------------- PRD-11 --- */

/**
 * PRD-11 — Shipping terms machine-readable (§12). Population: sampled product pages. A
 * page satisfies when structured shipping terms are present on the offer
 * (`shipping_details.structured`). No violation; zero state `not_detected`.
 * `not_applicable` when there are no product pages.
 *
 * **Signal-declared `partial` (PRD-11 Limits):** when no offer carries structured
 * shipping terms (the aggregate would be `not_detected`) but a shipping policy page
 * exists (`entity.policies.shipping`), the state is `partial` — "has a policy page but the
 * terms are not machine-readable on the offer". The policy-page component is sought-gated
 * (§4.4): it is only consulted when `policy` is in `crawl.sought[]`; otherwise the zero
 * state stands as `not_detected`, based on the offer alone. States: `pass` · `partial` ·
 * `not_detected` · `not_applicable`.
 */
export function prd11(
  pages: readonly ProductPageEvidence[],
  policyShipping: boolean,
  sought: readonly SoughtTarget[],
): SignalResult {
  return offerTermsSignal(
    pages,
    (p) => p.shipping_details !== null && p.shipping_details.structured === true,
    (i) => pageRef(i, 'shipping_details'),
    policyShipping,
    sought,
    ptr('entity', 'evidence', 'policies', 'shipping'),
    {
      pass: 'every sampled product page carries structured shipping terms on the offer',
      partialProp: 'sampled product pages carry structured shipping terms on the offer',
      partialPolicy: 'a shipping policy page exists but the terms are not structured on the offer',
      notDetected: 'no sampled product page carries structured shipping terms on the offer',
      notApplicable: 'no sampled product pages; machine-readable shipping terms do not apply',
    },
  );
}

/* --------------------------------------------------------------- PRD-12 --- */

/**
 * PRD-12 — Returns terms machine-readable (§12). As PRD-11 (PRD-12 Limits): population
 * is sampled product pages; a page satisfies when a structured return policy is present
 * on the offer (`return_policy.structured`); the signal-declared `partial` fires when no
 * offer is structured but a returns policy page exists (`entity.policies.returns`),
 * sought-gated on `policy`. States: `pass` · `partial` · `not_detected` · `not_applicable`.
 */
export function prd12(
  pages: readonly ProductPageEvidence[],
  policyReturns: boolean,
  sought: readonly SoughtTarget[],
): SignalResult {
  return offerTermsSignal(
    pages,
    (p) => p.return_policy !== null && p.return_policy.structured === true,
    (i) => pageRef(i, 'return_policy'),
    policyReturns,
    sought,
    ptr('entity', 'evidence', 'policies', 'returns'),
    {
      pass: 'every sampled product page carries a structured return policy on the offer',
      partialProp: 'sampled product pages carry a structured return policy on the offer',
      partialPolicy: 'a returns policy page exists but the terms are not structured on the offer',
      notDetected: 'no sampled product page carries a structured return policy on the offer',
      notApplicable: 'no sampled product pages; machine-readable returns terms do not apply',
    },
  );
}

/**
 * Shared body for PRD-11/PRD-12: an offer-terms population signal with the rubric's
 * signal-declared policy-page `partial` upgrade. Kept private; the two signals differ
 * only in the offer field, the policy flag, the refs and the reason strings.
 */
function offerTermsSignal(
  pages: readonly ProductPageEvidence[],
  satisfies: (p: ProductPageEvidence) => boolean,
  offerRef: (i: number) => string,
  policyPresent: boolean,
  sought: readonly SoughtTarget[],
  policyRef: string,
  reasons: { pass: string; partialProp: string; partialPolicy: string; notDetected: string; notApplicable: string },
): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({ applicable: true, evaluable: true, satisfying: satisfies(p) }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('product', 'evidence', 'pages')], reasons.notApplicable);
  }
  const offerRefs = pages.map((_, i) => offerRef(i));
  if (agg.state === 'pass') return scored(agg, offerRefs, reasons.pass);
  if (agg.state === 'partial') return scored(agg, offerRefs, `${agg.itemsSatisfying} of ${agg.itemsEvaluated} ${reasons.partialProp}`);

  // agg.state === 'not_detected' (no offer carries the structured terms). Sought-gated
  // policy-page upgrade to the signal-declared partial.
  const policySought = sought.includes('policy');
  if (policySought && policyPresent) {
    return {
      state: 'partial',
      itemsApplicable: agg.itemsApplicable,
      itemsEvaluated: agg.itemsEvaluated,
      itemsSatisfying: 0,
      evidenceRefs: [...offerRefs, policyRef, ptr('crawl', 'sample', 'sought')],
      reason: reasons.partialPolicy,
    };
  }
  return scored(agg, offerRefs, reasons.notDetected);
}
