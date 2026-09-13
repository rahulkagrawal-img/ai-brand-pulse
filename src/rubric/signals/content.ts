/**
 * Content & Topical Authority — the eight scored signals (Scoring Rubric v1.0 §10).
 *
 * Six are Type A (deterministic): CON-01, CON-02, CON-03, CON-05, CON-11, CON-12.
 * Two are Type B (reviewer-assessed): CON-04, CON-07.
 *
 * Each function is a PURE derivation: evidence in, `SignalResult` out (audit-spec
 * §7.2, Phase 3 planning D-1). No network, no clock, no LLM, no dependency beyond
 * the §6 aggregation primitive and the declared schema types (engineering-rules §3).
 *
 * TYPE A signals delegate their state to `aggregateItems` (rubric §6.2). Their empty
 * populations mean different things and map to different states, per the rubric:
 *   - a declared-list / page-population that is genuinely empty because the business
 *     has no such pages (no collections, no products) → `not_applicable` (§14.2),
 *     which the aggregation rule already returns for A == 0;
 *   - a "sampled commercial pages" population that can only be empty through a
 *     collection limitation (CON-12) → `not_evaluated`, matching the technical
 *     signals' treatment of the same situation.
 *
 * TYPE B signals (CON-04, CON-07) NEVER read a language model and NEVER infer a
 * state (engineering-rules §4). Their input is the reviewer record keyed by signal
 * ID in `review` (audit-spec §5b). With no reviewer record the signal is
 * `not_evaluated` — never zero, never guessed (rubric §2). The reviewer/… fields the
 * record must then carry (audit-spec §7.2) are added by the review/assembly layer,
 * not here; this derivation only resolves the state from the reviewer-populated
 * evidence, exactly as a Type A signal resolves it from observed evidence.
 *
 * `evidence_refs` are JSON Pointers (RFC 6901) into the audit record (D-2), non-empty
 * for every state except `not_evaluated` (audit-spec §7.2). Content evidence lives
 * under `/content/evidence/…`; CON-12 additionally reads `/crawl/pages` for its
 * population, because "sampled commercial pages" always means the pages in
 * `crawl.pages` (rubric §8, §14.1).
 */

import type { AggregationResult } from '../aggregation.ts';
import { aggregateItems, type PopulationItem } from '../aggregation.ts';
import type { SignalResult } from '../signal.ts';
import { L_ATTR_TEXT, L_INTENT } from '../lists.ts';
import {
  COMMERCIAL_PAGE_TYPES,
  type CollectionEvidence,
  type ContentProductEvidence,
  type CrawlPage,
  type DuplicationEvidence,
  type EditorialEvidence,
  type IntentCoverage,
  type ReviewRecord,
  type SoughtTarget,
} from '../../schema/evidence.ts';

/* ------------------------------------------------------------- helpers --- */

/** RFC 6901 JSON Pointer from path segments (D-2). Escapes `~` and `/` per the spec. */
function ptr(...segments: (string | number)[]): string {
  return '/' + segments.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

const COMMERCIAL = new Set<CrawlPage['page_type']>(COMMERCIAL_PAGE_TYPES);
const isCommercial = (p: CrawlPage): boolean => COMMERCIAL.has(p.page_type);

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
 * Reason text for a multi-item aggregate. The `partial` case states the proportion
 * from the recorded counts; those are data, not scoring thresholds.
 */
function reasonFor(agg: AggregationResult, thing: string, pass: string, zero: string): string {
  switch (agg.state) {
    case 'pass': return pass;
    case 'partial': return `${agg.itemsSatisfying} of ${agg.itemsEvaluated} ${thing}`;
    default: return zero; // not_detected / fail zero state
  }
}

/* --------------------------------------------------------------- CON-01 --- */

/**
 * CON-01 — Category and collection structure (§10). Population: sampled collection
 * pages (`content.collections[]`). A collection satisfies when it is linked from the
 * primary navigation landmark in the markup. No violation; zero state `not_detected`.
 * `not_applicable` when there are no collection pages (§14.2) — the aggregation rule
 * returns it for A == 0. A collection whose `in_primary_navigation` was not collected
 * is not evaluable.
 */
export function con01(collections: readonly CollectionEvidence[]): SignalResult {
  const items: PopulationItem[] = collections.map((c) => ({
    applicable: true,
    evaluable: c.in_primary_navigation !== undefined,
    satisfying: c.in_primary_navigation === true,
  }));

  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('content', 'evidence', 'collections')], 'no sampled collection pages; category structure does not apply');
  }
  if (agg.state === 'not_evaluated') {
    return notEvaluated('in_primary_navigation was not collected for any sampled collection page');
  }
  const refs = collections.map((_, i) => ptr('content', 'evidence', 'collections', i, 'in_primary_navigation'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled collection pages are linked from the primary navigation', 'every sampled collection page is linked from the primary navigation', 'no sampled collection page is linked from the primary navigation'),
  );
}

/* --------------------------------------------------------------- CON-02 --- */

/**
 * CON-02 — Collection pages carry body content (§10). Population: sampled collection
 * pages. A collection satisfies when it carries a text block outside the
 * product-listing container (`body_text_present`). No violation; zero state
 * `not_detected`. `not_applicable` when there are no collection pages (§14.2).
 */
export function con02(collections: readonly CollectionEvidence[]): SignalResult {
  const items: PopulationItem[] = collections.map((c) => ({
    applicable: true,
    evaluable: c.body_text_present !== undefined,
    satisfying: c.body_text_present === true,
  }));

  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('content', 'evidence', 'collections')], 'no sampled collection pages; collection body content does not apply');
  }
  if (agg.state === 'not_evaluated') {
    return notEvaluated('body_text_present was not collected for any sampled collection page');
  }
  const refs = collections.map((_, i) => ptr('content', 'evidence', 'collections', i, 'body_text_present'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled collection pages carry body content', 'every sampled collection page carries body content', 'no sampled collection page carries body content'),
  );
}

/* --------------------------------------------------------------- CON-03 --- */

/**
 * CON-03 — Product descriptions carry text (§10). Population: sampled product pages.
 * A product satisfies when a non-empty text block is present in its description region
 * (`description_text_present`). No violation; zero state `not_detected`.
 * `not_applicable` when there are no product pages (§4.5, §14.2).
 */
export function con03(products: readonly ContentProductEvidence[]): SignalResult {
  const items: PopulationItem[] = products.map((p) => ({
    applicable: true,
    evaluable: p.description_text_present !== undefined,
    satisfying: p.description_text_present === true,
  }));

  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  if (agg.state === 'not_applicable') {
    return notApplicable([ptr('content', 'evidence', 'products')], 'no sampled product pages; product description text does not apply');
  }
  if (agg.state === 'not_evaluated') {
    return notEvaluated('description_text_present was not collected for any sampled product page');
  }
  const refs = products.map((_, i) => ptr('content', 'evidence', 'products', i, 'description_text_present'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled product pages carry description text', 'every sampled product page carries description text', 'no sampled product page carries description text'),
  );
}

/* --------------------------------------------------------------- CON-05 --- */

/**
 * The editorial-hub presence state shared by CON-05 and, as a prerequisite, CON-11.
 * Sought-gated on `editorial` (§4.4): a hub not looked for is `not_evaluated`, never
 * `not_detected`. Binary presence only — no `partial`.
 */
function editorialHubState(editorial: EditorialEvidence, sought: readonly SoughtTarget[]): 'pass' | 'not_detected' | 'not_evaluated' {
  if (!sought.includes('editorial')) return 'not_evaluated';
  return editorial.hub_present ? 'pass' : 'not_detected';
}

/**
 * CON-05 — Informational content hub (§10). Single item — the site. Satisfies when a
 * blog / journal / guides / resources section is discoverable (`hub_present`).
 * Sought-gated: `not_evaluated` if `editorial` is absent from `crawl.sought[]` (§4.4).
 * States: `pass` · `not_detected` · `not_evaluated` — no `partial`.
 */
export function con05(editorial: EditorialEvidence, sought: readonly SoughtTarget[]): SignalResult {
  const state = editorialHubState(editorial, sought);
  if (state === 'not_evaluated') {
    return notEvaluated('editorial was not among crawl.sought[]; an informational hub was not assessed');
  }
  const refs = [ptr('content', 'evidence', 'editorial', 'hub_present')];
  return state === 'pass'
    ? { state: 'pass', itemsApplicable: 1, itemsEvaluated: 1, itemsSatisfying: 1, evidenceRefs: refs, reason: 'an editorial or informational section is discoverable' }
    : { state: 'not_detected', itemsApplicable: 1, itemsEvaluated: 1, itemsSatisfying: 0, evidenceRefs: refs, reason: 'no editorial or informational section was detected in the pages reviewed' };
}

/* --------------------------------------------------------------- CON-11 --- */

/**
 * CON-11 — Internal content relationships (§10). Whether editorial and commercial
 * content link to each other. Zero state `not_detected`; `partial` when links run one
 * way only; `not_applicable` when CON-05 is `not_detected` (no editorial to relate);
 * `not_evaluated` when CON-05 is `not_evaluated` (the prerequisite was not evaluable,
 * §4.2).
 *
 * The rubric declares `pass` a reachable state (§4, §21) and forbids a signal-local
 * single-item `partial` outside TEC-03/TEC-13 (§6.5 exception). CON-11 is therefore a
 * TWO-ITEM population — one item per link direction — resolved by the ordinary
 * aggregation rule: both directions present → `pass`, one → `partial`, neither →
 * `not_detected`. Each direction has its OWN, independently observable evidence, so no
 * existing field is renamed or reinterpreted:
 *   - editorial → commercial: a sampled editorial article links to a product or
 *     collection page (`content.editorial.articles[].internal_links[]` targeting a
 *     `content.products[].url` / `content.collections[].url`), OR a sampled product
 *     records inbound editorial links (`content.products[].inbound_editorial_links > 0`
 *     — kept with its original "inbound links FROM editorial" meaning);
 *   - commercial → editorial: a sampled commercial page (a `crawl.pages[]` entry of a
 *     commercial type other than `editorial`) has an `internal_links[]` target that is
 *     an editorial URL (`content.editorial.hub_url` or a `content.editorial.articles[].url`).
 * The commercial → editorial direction reads the already-collected
 * `crawl.pages[].internal_links[]` rather than any product-side link list, which the
 * content evidence does not carry; nothing new is fabricated.
 */
export function con11(
  editorial: EditorialEvidence,
  products: readonly ContentProductEvidence[],
  collections: readonly CollectionEvidence[],
  pages: readonly CrawlPage[],
  sought: readonly SoughtTarget[],
): SignalResult {
  const prereq = editorialHubState(editorial, sought);
  if (prereq === 'not_evaluated') {
    return notEvaluated('CON-05 is not_evaluated (editorial was not sought); content relationships were not assessed');
  }
  if (prereq === 'not_detected') {
    return notApplicable([ptr('content', 'evidence', 'editorial', 'hub_present')], 'no editorial content (CON-05 not_detected); there is nothing to relate');
  }

  const productCollectionUrls = new Set<string>([
    ...products.map((p) => p.url),
    ...collections.map((c) => c.url),
  ]);
  const editorialUrls = new Set<string>();
  if (editorial.hub_url != null) editorialUrls.add(editorial.hub_url);
  for (const a of editorial.articles ?? []) editorialUrls.add(a.url);

  const editorialToCommercial =
    (editorial.articles ?? []).some((a) => (a.internal_links ?? []).some((l) => productCollectionUrls.has(l))) ||
    products.some((p) => (p.inbound_editorial_links ?? 0) > 0);
  const commercialToEditorial = pages.some(
    (p) => isCommercial(p) && p.page_type !== 'editorial' && p.internal_links.some((l) => editorialUrls.has(l)),
  );

  const items: PopulationItem[] = [
    { applicable: true, evaluable: true, satisfying: editorialToCommercial },
    { applicable: true, evaluable: true, satisfying: commercialToEditorial },
  ];
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('content', 'evidence', 'editorial'), ptr('content', 'evidence', 'products'), ptr('crawl', 'pages')];

  let reason: string;
  switch (agg.state) {
    case 'pass': reason = 'editorial content links to commercial pages and commercial pages link to editorial content'; break;
    case 'partial': reason = editorialToCommercial ? 'editorial links to commercial content, but no commercial page links back to editorial' : 'commercial content links to editorial, but no editorial page links to commercial content'; break;
    default: reason = 'no internal links were detected between editorial and commercial content'; break;
  }
  return scored(agg, refs, reason);
}

/* --------------------------------------------------------------- CON-12 --- */

/**
 * CON-12 — Thin and duplicate content (§10). Population: sampled commercial pages
 * (from `crawl.pages`, rubric §8). A page satisfies when its body is non-empty and its
 * body is not shared with another distinct non-templated sampled page. Templated
 * (paginated / filtered) variants declared in `templated_page_urls` are excluded from
 * duplicate grouping (Limits), so sharing a body only with a templated page is not a
 * duplicate. No violation; zero state `fail`. `not_evaluated` when no commercial pages
 * were sampled — a collection limitation, not a site property.
 */
export function con12(pages: readonly CrawlPage[], duplication: DuplicationEvidence): SignalResult {
  const commercial = pages.map((p, i) => ({ p, i })).filter((x) => isCommercial(x.p));
  if (commercial.length === 0) return notEvaluated('no sampled commercial pages to assess for thin or duplicate content');

  const empty = new Set(duplication.empty_body_pages);
  const templated = new Set(duplication.templated_page_urls ?? []);

  const items: PopulationItem[] = commercial.map(({ p }) => {
    const emptyBody = empty.has(p.url);
    const duplicated = duplication.exact_duplicate_groups.some(
      (group) => group.includes(p.url) && group.some((other) => other !== p.url && !templated.has(other)),
    );
    return { applicable: true, evaluable: true, satisfying: !emptyBody && !duplicated };
  });

  const agg = aggregateItems(items, { zeroState: 'fail' });
  const refs = [
    ptr('content', 'evidence', 'duplication'),
    ...commercial.map(({ i }) => ptr('crawl', 'pages', i, 'url')),
  ];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled commercial pages have unique, non-empty bodies', 'every sampled commercial page has a unique, non-empty body', 'no sampled commercial page has a unique, non-empty body'),
  );
}

/* --------------------------------------------------------------- CON-04 --- */

/**
 * CON-04 — Product attribute narrative (§10). **Type B — reviewer-assessed.**
 * Population: `L-ATTR-TEXT` (5 members), assessed across sampled product pages. A
 * member satisfies when the reviewer records it as stated in extractable text on at
 * least one sampled product page (`content.products[].attributes_in_text[]`).
 *
 * With no reviewer record for CON-04 the signal is `not_evaluated` (rubric §2) — never
 * inferred, never defaulted to zero, never populated by a language model
 * (engineering-rules §4). `not_applicable` when there are no product pages: with no
 * catalogue there is no product text for the attributes to be about (§4.5). Zero state
 * `not_detected`. Membership is matched exactly against `L-ATTR-TEXT` (§6.4).
 */
export function con04(products: readonly ContentProductEvidence[], review: ReviewRecord | undefined): SignalResult {
  if (review === undefined) return notEvaluated('CON-04 has no reviewer record; a Type B signal is not_evaluated without one');
  if (products.length === 0) {
    return notApplicable([ptr('content', 'evidence', 'products'), ptr('review', 'CON-04')], 'no sampled product pages; product attribute narrative does not apply');
  }

  const stated = new Set<string>();
  for (const p of products) for (const a of p.attributes_in_text ?? []) stated.add(a);

  const items: PopulationItem[] = L_ATTR_TEXT.map((attr) => ({
    applicable: true,
    evaluable: true,
    satisfying: stated.has(attr),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('review', 'CON-04'), ...products.map((_, i) => ptr('content', 'evidence', 'products', i, 'attributes_in_text'))];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-ATTR-TEXT attributes are stated in product text', 'every L-ATTR-TEXT attribute is stated in product text on at least one sampled product page', 'no L-ATTR-TEXT attribute is stated in product text'),
  );
}

/* --------------------------------------------------------------- CON-07 --- */

/**
 * CON-07 — Buyer-intent coverage (§10). **Type B — reviewer-assessed.** Population:
 * `L-INTENT` (6 members). An intent satisfies when the reviewer maps at least one
 * sampled page to it (`content.intent_coverage[]`).
 *
 * With no reviewer record the signal is `not_evaluated` (rubric §2). Every intent
 * always applies, so there is no `not_applicable`. Zero state `not_detected`. Intent
 * names are matched exactly against `L-INTENT` (§6.4); the schema already constrains
 * `intent_coverage[].intent` to that enum.
 */
export function con07(intentCoverage: readonly IntentCoverage[], review: ReviewRecord | undefined): SignalResult {
  if (review === undefined) return notEvaluated('CON-07 has no reviewer record; a Type B signal is not_evaluated without one');

  const covered = new Set<string>();
  for (const entry of intentCoverage) if (entry.pages.length > 0) covered.add(entry.intent);

  const items: PopulationItem[] = L_INTENT.map((intent) => ({
    applicable: true,
    evaluable: true,
    satisfying: covered.has(intent),
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('review', 'CON-07'), ptr('content', 'evidence', 'intent_coverage')];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-INTENT buyer intents are covered by sampled content', 'every L-INTENT buyer intent is covered by at least one sampled page', 'no L-INTENT buyer intent is covered by sampled content'),
  );
}
