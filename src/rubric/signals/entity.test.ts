/**
 * Entity & Trust signals — Layer 1 derivation tests (tests/README §3).
 *
 * One `describe` per signal, covering every reachable state plus the boundary cases
 * that distinguish adjacent states. Expected states are hand-derived from
 * `scoring-rubric.md` §11, never recorded from the engine (tests/README §4). Each test
 * uses a minimal evidence object built from the factories below.
 *
 * ENT-06 is intentionally absent — its evidence-combination rule is ambiguous and
 * awaits a ruling (see entity.ts header and the report).
 *
 * Type B signals (ENT-04, ENT-10) are additionally exercised for the §2 contract: with
 * no reviewer record they are `not_evaluated`, never zero and never guessed.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CrawlPage, EntityEvidence, ReviewRecord, SoughtTarget } from '../../schema/evidence.ts';
import type { SignalResult } from '../signal.ts';
import { ent01, ent02, ent03, ent04, ent05, ent07, ent09, ent10 } from './entity.ts';

/* ----------------------------------------------------------- factories --- */

function page(overrides: Partial<CrawlPage>): CrawlPage {
  return {
    url: 'https://brand.test/',
    final_url: 'https://brand.test/',
    status_code: 200,
    page_type: 'home',
    depth_from_home: 0,
    title: 'Brand',
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

/** A page carrying a parseable Organization node (ENT-01 detects it). */
function orgPage(types: string[] = ['Organization'], parse_ok = true): CrawlPage {
  return page({ structured_data: [{ format: 'json-ld', types, parse_ok }] });
}

function organization(overrides: Partial<NonNullable<EntityEvidence['organization']>>): EntityEvidence['organization'] {
  return { ...overrides };
}

function about(overrides: Partial<EntityEvidence['about']>): EntityEvidence['about'] {
  return { url: null, present: false, ...overrides };
}

function identity(overrides: Partial<EntityEvidence['identity']>): EntityEvidence['identity'] {
  return { what_sold_stated: false, location_stated: false, trading_name_stated: false, ...overrides };
}

function contact(overrides: Partial<EntityEvidence['contact']>): EntityEvidence['contact'] {
  return { page_present: false, email: null, phone: null, postal_address: null, contact_form: false, ...overrides };
}

function policies(overrides: Partial<EntityEvidence['policies']>): EntityEvidence['policies'] {
  return { privacy: false, terms: false, returns: false, shipping: false, refunds: false, ...overrides };
}

function credential(overrides: Partial<EntityEvidence['credentials'][number]>): EntityEvidence['credentials'][number] {
  return { claim_text: 'Silk Mark certified', source_url: 'https://brand.test/products/x', image_only: false, independently_verified: false, ...overrides };
}

function review(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return { reviewer: 'test-operator', reviewed_at: '2026-09-12T00:00:00+00:00', method: 'checklist', reason: 'hand-derived test record', ...overrides };
}

const SOUGHT_ALL: SoughtTarget[] = ['home', 'about', 'contact', 'policy'];
const SOUGHT_NONE: SoughtTarget[] = ['home'];

function assertScoredRefs(result: SignalResult): void {
  ok(result.evidenceRefs.length > 0, 'evidence_refs must be non-empty for a scored/not_applicable state');
  ok(result.evidenceRefs.every((r) => r.startsWith('/')), 'evidence_refs must be JSON Pointers');
  ok(result.reason.length > 0, 'reason must be present');
}

function assertNotEvaluated(result: SignalResult): void {
  strictEqual(result.state, 'not_evaluated');
  deepStrictEqual([...result.evidenceRefs], []);
}

/* --------------------------------------------------------------- ENT-01 --- */

describe('ENT-01 — Organization structured data present', () => {
  it('pass — a parseable Organization node is present', () => {
    const r = ent01([orgPage(['Organization'])]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('pass — a rubric-named subtype (OnlineStore) counts', () => {
    strictEqual(ent01([orgPage(['OnlineStore'])]).state, 'pass');
  });

  it('not_detected — only WebSite markup, no Organization node', () => {
    const r = ent01([page({ structured_data: [{ format: 'json-ld', types: ['WebSite'], parse_ok: true }] })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_detected — an Organization block that does not parse does not satisfy', () => {
    strictEqual(ent01([orgPage(['Organization'], false)]).state, 'not_detected');
  });
});

/* --------------------------------------------------------------- ENT-02 --- */

describe('ENT-02 — Organization schema completeness', () => {
  const full = {
    name: 'Brand', url: 'https://brand.test', logo: 'https://brand.test/logo.png',
    description: 'A maker of things.', contact_point: { telephone: '+1' }, address: { locality: 'Town' },
  };

  it('pass — all six L-ORG-PROP properties present and non-empty', () => {
    const r = ent02([orgPage()], organization(full));
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — name present with only some other properties', () => {
    const r = ent02([orgPage()], organization({ name: 'Brand', url: 'https://brand.test' }));
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
    assertScoredRefs(r);
  });

  it('partial — name present alone (boundary just above the violation)', () => {
    const r = ent02([orgPage()], organization({ name: 'Brand' }));
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('fail — populated node missing its name (scoped violation)', () => {
    const r = ent02([orgPage()], organization({ url: 'https://brand.test', logo: 'https://brand.test/l.png' }));
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('not_detected — Organization node present but carries no readable property', () => {
    const r = ent02([orgPage()], organization({}));
    strictEqual(r.state, 'not_detected');
    strictEqual(r.itemsSatisfying, 0);
    assertScoredRefs(r);
  });

  it('not_detected — empty string and empty object do not count as present', () => {
    const r = ent02([orgPage()], organization({ name: '   ', contact_point: {} }));
    strictEqual(r.state, 'not_detected');
  });

  it('not_evaluated — ENT-01 not_detected (no Organization node)', () => {
    assertNotEvaluated(ent02([page({})], organization(full)));
  });

  it('not_evaluated — node in markup but no resolved organization object', () => {
    assertNotEvaluated(ent02([orgPage()], null));
  });
});

/* --------------------------------------------------------------- ENT-03 --- */

describe('ENT-03 — About page present', () => {
  it('pass — About page discoverable and about was sought', () => {
    const r = ent03(about({ present: true, url: 'https://brand.test/about' }), SOUGHT_ALL);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('not_detected — about sought but not present', () => {
    const r = ent03(about({ present: false }), SOUGHT_ALL);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — about was not sought (§4.4)', () => {
    assertNotEvaluated(ent03(about({ present: false }), SOUGHT_NONE));
  });
});

/* --------------------------------------------------------------- ENT-04 --- */

describe('ENT-04 — business identity clarity (Type B)', () => {
  it('pass — reviewer records all three components stated in text', () => {
    const r = ent04(identity({ what_sold_stated: true, location_stated: true, trading_name_stated: true }), review());
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — reviewer records some components stated', () => {
    const r = ent04(identity({ trading_name_stated: true }), review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — reviewer records no component stated in text', () => {
    const r = ent04(identity({}), review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — no reviewer record (Type B default, rubric §2)', () => {
    assertNotEvaluated(ent04(identity({ what_sold_stated: true, location_stated: true, trading_name_stated: true }), undefined));
  });
});

/* --------------------------------------------------------------- ENT-05 --- */

describe('ENT-05 — contact information completeness', () => {
  it('pass — every L-CONTACT channel present as text', () => {
    const r = ent05(contact({ email: 'a@brand.test', phone: '+1', postal_address: '1 Road, Town' }), SOUGHT_ALL);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some channels present', () => {
    const r = ent05(contact({ email: 'a@brand.test' }), SOUGHT_ALL);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — a contact form alone satisfies no L-CONTACT member', () => {
    const r = ent05(contact({ contact_form: true }), SOUGHT_ALL);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — contact was not sought (§4.4)', () => {
    assertNotEvaluated(ent05(contact({ email: 'a@brand.test' }), SOUGHT_NONE));
  });
});

/* --------------------------------------------------------------- ENT-07 --- */

describe('ENT-07 — external entity references (sameAs)', () => {
  it('pass — at least one sameAs URL declared', () => {
    const r = ent07(['https://social.test/brand'], []);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('pass — a declared sameAs wins even when markup links also exist', () => {
    strictEqual(ent07(['https://social.test/brand'], ['https://social.test/brand']).state, 'pass');
  });

  it('partial — social links in markup but none declared in sameAs', () => {
    const r = ent07([], ['https://social.test/brand']);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('not_detected — no sameAs and no social links in markup', () => {
    const r = ent07([], []);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_detected — social_links_in_markup absent (undefined)', () => {
    strictEqual(ent07([], undefined).state, 'not_detected');
  });
});

/* --------------------------------------------------------------- ENT-09 --- */

describe('ENT-09 — trust and policy pages', () => {
  it('pass — every L-POLICY page discoverable', () => {
    const r = ent09(policies({ privacy: true, terms: true, returns: true, shipping: true, refunds: true }), SOUGHT_ALL);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some policy pages discoverable', () => {
    const r = ent09(policies({ privacy: true, returns: true }), SOUGHT_ALL);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
    assertScoredRefs(r);
  });

  it('not_detected — no policy page discoverable', () => {
    const r = ent09(policies({}), SOUGHT_ALL);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — policy was not sought (§4.4)', () => {
    assertNotEvaluated(ent09(policies({ privacy: true }), SOUGHT_NONE));
  });
});

/* --------------------------------------------------------------- ENT-10 --- */

describe('ENT-10 — credential and certification claims (Type B)', () => {
  it('pass — every credential claim stated in extractable text', () => {
    const r = ent10([credential({ image_only: false })], review());
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some claims in text, some image-only', () => {
    const r = ent10([credential({ image_only: false }), credential({ image_only: true })], review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('not_detected — the only claim is image-only', () => {
    const r = ent10([credential({ image_only: true })], review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — reviewer records no credential claimed anywhere', () => {
    const r = ent10([], review());
    strictEqual(r.state, 'not_applicable');
    assertScoredRefs(r);
  });

  it('not_evaluated — no reviewer record (Type B default, rubric §2)', () => {
    assertNotEvaluated(ent10([credential({ image_only: false })], undefined));
  });
});
