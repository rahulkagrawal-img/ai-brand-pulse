/**
 * Content & Topical Authority signals — Layer 1 derivation tests (tests/README §3).
 *
 * One `describe` per signal, covering every reachable state. Expected states are
 * hand-derived from `scoring-rubric.md` §10, never recorded from the engine
 * (tests/README §4). Each test uses a minimal evidence object built from the
 * factories below — only the fields the signal reads are set.
 *
 * Type B signals (CON-04, CON-07) are additionally exercised for the §2 contract:
 * with no reviewer record they are `not_evaluated`, never zero and never guessed.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  CollectionEvidence,
  ContentProductEvidence,
  CrawlPage,
  DuplicationEvidence,
  EditorialEvidence,
  IntentCoverage,
  ReviewRecord,
  SoughtTarget,
} from '../../schema/evidence.ts';
import type { SignalResult } from '../signal.ts';
import { con01, con02, con03, con04, con05, con07, con11, con12 } from './content.ts';

/* ----------------------------------------------------------- factories --- */

function collection(overrides: Partial<CollectionEvidence>): CollectionEvidence {
  return { url: 'https://brand.test/collections/c', ...overrides };
}

function product(overrides: Partial<ContentProductEvidence>): ContentProductEvidence {
  return { url: 'https://brand.test/products/p', ...overrides };
}

function editorial(overrides: Partial<EditorialEvidence>): EditorialEvidence {
  return { hub_present: true, hub_url: 'https://brand.test/journal', ...overrides };
}

function review(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    reviewer: 'test-operator',
    reviewed_at: '2026-09-12T00:00:00+00:00',
    method: 'checklist',
    reason: 'hand-derived test record',
    ...overrides,
  };
}

function duplication(overrides: Partial<DuplicationEvidence>): DuplicationEvidence {
  return { exact_duplicate_groups: [], empty_body_pages: [], ...overrides };
}

function page(overrides: Partial<CrawlPage>): CrawlPage {
  return {
    url: 'https://brand.test/',
    final_url: 'https://brand.test/',
    status_code: 200,
    page_type: 'product',
    depth_from_home: 1,
    title: 'Title',
    meta_description: null,
    meta_robots: null,
    x_robots_tag: null,
    canonical_url: null,
    canonical_count: 0,
    viewport_meta: null,
    headings: [],
    internal_links: [],
    external_links: [],
    structured_data: [],
    ...overrides,
  };
}

const SOUGHT_WITH_EDITORIAL: SoughtTarget[] = ['home', 'editorial'];
const SOUGHT_WITHOUT_EDITORIAL: SoughtTarget[] = ['home', 'product'];

/** Every scored (non-`not_evaluated`) state must carry non-empty JSON Pointer refs. */
function assertScoredRefs(result: SignalResult): void {
  ok(result.evidenceRefs.length > 0, 'evidence_refs must be non-empty for a scored state');
  ok(result.evidenceRefs.every((r) => r.startsWith('/')), 'evidence_refs must be JSON Pointers');
  ok(result.reason.length > 0, 'reason must be present');
}

function assertNotEvaluated(result: SignalResult): void {
  strictEqual(result.state, 'not_evaluated');
  deepStrictEqual([...result.evidenceRefs], []);
}

/* --------------------------------------------------------------- CON-01 --- */

describe('CON-01 — category and collection structure', () => {
  it('pass — every sampled collection is in primary navigation', () => {
    const r = con01([collection({ in_primary_navigation: true }), collection({ in_primary_navigation: true })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some collections in navigation, some not', () => {
    const r = con01([collection({ in_primary_navigation: true }), collection({ in_primary_navigation: false })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — no collection is in primary navigation', () => {
    const r = con01([collection({ in_primary_navigation: false })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — no sampled collection pages (§14.2)', () => {
    const r = con01([]);
    strictEqual(r.state, 'not_applicable');
    assertScoredRefs(r);
  });

  it('not_evaluated — in_primary_navigation not collected for any collection', () => {
    // Defensive missing-evidence path: the field is optional in the schema and, when
    // absent, must not silently score as absence (engineering-rules §2, §4.2).
    assertNotEvaluated(con01([collection({})]));
  });
});

/* --------------------------------------------------------------- CON-02 --- */

describe('CON-02 — collection pages carry body content', () => {
  it('pass — every collection carries body content', () => {
    const r = con02([collection({ body_text_present: true }), collection({ body_text_present: true })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some collections carry body content, some do not', () => {
    const r = con02([collection({ body_text_present: true }), collection({ body_text_present: false })]);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('not_detected — no collection carries body content', () => {
    const r = con02([collection({ body_text_present: false })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — no sampled collection pages (§14.2)', () => {
    strictEqual(con02([]).state, 'not_applicable');
  });

  it('not_evaluated — body_text_present not collected for any collection', () => {
    assertNotEvaluated(con02([collection({})]));
  });
});

/* --------------------------------------------------------------- CON-03 --- */

describe('CON-03 — product descriptions carry text', () => {
  it('pass — every product carries description text', () => {
    const r = con03([product({ description_text_present: true }), product({ description_text_present: true })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some products carry description text, some do not', () => {
    const r = con03([product({ description_text_present: true }), product({ description_text_present: false })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — no product carries description text', () => {
    const r = con03([product({ description_text_present: false })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — no sampled product pages (§4.5, §14.2)', () => {
    strictEqual(con03([]).state, 'not_applicable');
  });

  it('not_evaluated — description_text_present not collected for any product', () => {
    assertNotEvaluated(con03([product({})]));
  });
});

/* --------------------------------------------------------------- CON-05 --- */

describe('CON-05 — informational content hub', () => {
  it('pass — an editorial hub is discoverable and editorial was sought', () => {
    const r = con05(editorial({ hub_present: true }), SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('not_detected — editorial sought but no hub present', () => {
    const r = con05(editorial({ hub_present: false, hub_url: null }), SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — editorial was not sought (§4.4)', () => {
    // Even with hub_present false, an unsought target is not_evaluated, never not_detected.
    assertNotEvaluated(con05(editorial({ hub_present: false, hub_url: null }), SOUGHT_WITHOUT_EDITORIAL));
  });
});

/* --------------------------------------------------------------- CON-11 --- */

describe('CON-11 — internal content relationships', () => {
  const article = (links: string[]) => ({ url: 'https://brand.test/journal/a', internal_links: links });
  const prod = 'https://brand.test/products/p';
  const coll = 'https://brand.test/collections/c';

  it('pass — editorial links to commercial and commercial links back to editorial', () => {
    const ed = editorial({ hub_present: true, articles: [article([prod])] });
    const products = [product({ url: prod, inbound_editorial_links: 2 })];
    const r = con11(ed, products, [collection({ url: coll })], SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — editorial links to commercial but no commercial page links back', () => {
    const ed = editorial({ hub_present: true, articles: [article([coll])] });
    const products = [product({ url: prod, inbound_editorial_links: 0 })];
    const r = con11(ed, products, [collection({ url: coll })], SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — editorial exists but no links run either way', () => {
    const ed = editorial({ hub_present: true, articles: [article(['https://brand.test/about'])] });
    const products = [product({ url: prod, inbound_editorial_links: 0 })];
    const r = con11(ed, products, [collection({ url: coll })], SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — CON-05 not_detected (no editorial to relate)', () => {
    const ed = editorial({ hub_present: false, hub_url: null, articles: [] });
    const r = con11(ed, [product({ url: prod, inbound_editorial_links: 1 })], [], SOUGHT_WITH_EDITORIAL);
    strictEqual(r.state, 'not_applicable');
    assertScoredRefs(r);
  });

  it('not_evaluated — CON-05 not_evaluated (editorial not sought)', () => {
    const ed = editorial({ hub_present: true, articles: [article([prod])] });
    assertNotEvaluated(con11(ed, [product({ url: prod, inbound_editorial_links: 1 })], [], SOUGHT_WITHOUT_EDITORIAL));
  });
});

/* --------------------------------------------------------------- CON-12 --- */

describe('CON-12 — thin and duplicate content', () => {
  const home = page({ page_type: 'home', url: 'https://brand.test/' });
  const p1 = page({ page_type: 'product', url: 'https://brand.test/p1' });
  const p2 = page({ page_type: 'product', url: 'https://brand.test/p2' });

  it('pass — every commercial page has a unique, non-empty body', () => {
    const r = con12([home, p1, p2], duplication({}));
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one page empty or duplicated, others unique', () => {
    const dup = duplication({ empty_body_pages: ['https://brand.test/p2'] });
    const r = con12([home, p1, p2], dup);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
    assertScoredRefs(r);
  });

  it('fail — no commercial page has a unique, non-empty body (zero state)', () => {
    const dup = duplication({ exact_duplicate_groups: [['https://brand.test/p1', 'https://brand.test/p2']], empty_body_pages: ['https://brand.test/'] });
    const r = con12([home, p1, p2], dup);
    strictEqual(r.state, 'fail');
    strictEqual(r.itemsSatisfying, 0);
    assertScoredRefs(r);
  });

  it('pass — sharing a body only with a templated page is not a duplicate', () => {
    // p2 is a paginated/filtered variant declared in templated_page_urls, so p1 sharing
    // its body only with p2 is not counted as a duplicate (CON-12 Limits).
    const dup = duplication({
      exact_duplicate_groups: [['https://brand.test/p1', 'https://brand.test/p2']],
      templated_page_urls: ['https://brand.test/p2'],
    });
    const r = con12([home, p1], dup);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('not_evaluated — no sampled commercial pages', () => {
    assertNotEvaluated(con12([page({ page_type: 'search', url: 'https://brand.test/search' })], duplication({})));
  });
});

/* --------------------------------------------------------------- CON-04 --- */

describe('CON-04 — product attribute narrative (Type B)', () => {
  const allAttrs = ['material', 'dimensions', 'technique_or_craft', 'origin', 'care'];

  it('pass — reviewer records every L-ATTR-TEXT attribute stated in text', () => {
    const products = [product({ attributes_in_text: allAttrs })];
    const r = con04(products, review());
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — reviewer records some attributes stated across products', () => {
    const products = [
      product({ url: 'https://brand.test/products/a', attributes_in_text: ['material', 'origin'] }),
      product({ url: 'https://brand.test/products/b', attributes_in_text: ['care'] }),
    ];
    const r = con04(products, review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 3);
    strictEqual(r.itemsEvaluated, 5);
    assertScoredRefs(r);
  });

  it('not_detected — reviewer records no attribute stated in text', () => {
    const products = [product({ attributes_in_text: [] })];
    const r = con04(products, review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — reviewer present but no product pages (§4.5)', () => {
    const r = con04([], review());
    strictEqual(r.state, 'not_applicable');
    assertScoredRefs(r);
  });

  it('not_evaluated — no reviewer record (Type B default, rubric §2)', () => {
    // Never zero, never guessed, never populated by an LLM (engineering-rules §4).
    assertNotEvaluated(con04([product({ attributes_in_text: allAttrs })], undefined));
  });
});

/* --------------------------------------------------------------- CON-07 --- */

describe('CON-07 — buyer-intent coverage (Type B)', () => {
  const intents = (...names: string[]): IntentCoverage[] =>
    names.map((n) => ({ intent: n as IntentCoverage['intent'], pages: [`https://brand.test/${n}`] }));

  it('pass — reviewer maps a page to every L-INTENT member', () => {
    const cov = intents('how_to_choose', 'sizing_and_fit', 'care_and_maintenance', 'authenticity_and_provenance', 'shipping_and_duties', 'comparison');
    const r = con07(cov, review());
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — reviewer covers some intents but not all', () => {
    const r = con07(intents('how_to_choose', 'care_and_maintenance'), review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
    strictEqual(r.itemsEvaluated, 6);
    assertScoredRefs(r);
  });

  it('not_detected — reviewer maps no page to any intent', () => {
    const r = con07([], review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_detected — an intent entry with no pages does not satisfy', () => {
    const r = con07([{ intent: 'how_to_choose', pages: [] }], review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — no reviewer record (Type B default, rubric §2)', () => {
    assertNotEvaluated(con07(intents('how_to_choose'), undefined));
  });
});
