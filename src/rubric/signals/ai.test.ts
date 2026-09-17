/**
 * AI Discoverability Readiness signals — Layer 1 derivation tests (tests/README §3).
 *
 * One `describe` per signal, covering every reachable state and the rubric boundaries.
 * Expected states are hand-derived from `scoring-rubric.md` §13 and §14, never recorded
 * from the engine (tests/README §4). Each test builds minimal evidence from the factories
 * below — only the fields a signal reads are varied.
 *
 * Type B signals (AID-01, AID-02) are exercised for the §2 contract: with no reviewer
 * record they are `not_evaluated`, never zero. Two states are reachable only with rubric
 * data that does not currently exist and are documented rather than tested: AID-08's
 * pass/partial/fail (L-AIAGENT is empty rubric data — lists.ts / rubric §7/§18) and
 * AID-09's `not_applicable` (listed in §13 but given no trigger by §13 or §14.2, and
 * unobservable from AID-09's permitted evidence).
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  AiEvidence, CrawlPage, EditorialEvidence, ReviewRecord, RobotsTxt, SoughtTarget,
} from '../../schema/evidence.ts';
import type { SignalResult } from '../signal.ts';
import { aid01, aid02, aid03, aid06, aid07, aid08, aid09 } from './ai.ts';

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

function answerability(pages_with_lead_answer: number, question_headings: string[] = []): AiEvidence['answerability'] {
  return { pages_with_lead_answer, question_headings };
}

function facts(overrides: Partial<AiEvidence['facts']> = {}): AiEvidence['facts'] {
  return { facts_in_text: [], facts_image_only: [], ...overrides };
}

function faq(overrides: Partial<AiEvidence['faq']> = {}): AiEvidence['faq'] {
  return { faq_pages: [], faqpage_schema_present: false, ...overrides };
}

function relationships(overrides: Partial<AiEvidence['relationships']> = {}): AiEvidence['relationships'] {
  return { breadcrumbs_present: false, entity_links_present: false, about_mentions_present: false, ...overrides };
}

function commercialFacts(overrides: Partial<AiEvidence['commercial_facts']> = {}): AiEvidence['commercial_facts'] {
  return { price_in_text: false, shipping_in_text: false, returns_in_text: false, ...overrides };
}

function editorial(overrides: Partial<EditorialEvidence> = {}): EditorialEvidence {
  return { hub_present: false, hub_url: null, ...overrides };
}

function robots(overrides: Partial<RobotsTxt> = {}): RobotsTxt {
  return { fetched: true, status_code: 200, body: '', rules: [], sitemap_directives: [], agent_rules: {}, ...overrides };
}

function review(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return { reviewer: 'test-operator', reviewed_at: '2026-09-12T00:00:00+00:00', method: 'checklist', reason: 'hand-derived test record', ...overrides };
}

const SOUGHT_ALL: SoughtTarget[] = ['home', 'editorial', 'faq', 'robots_txt'];
const editorialPage = () => page({ page_type: 'editorial', url: 'https://brand.test/journal/a' });
const faqPage = () => page({ page_type: 'faq', url: 'https://brand.test/faq' });

function assertScoredRefs(result: SignalResult): void {
  ok(result.evidenceRefs.length > 0, 'evidence_refs must be non-empty for a scored/not_applicable state');
  ok(result.evidenceRefs.every((r) => r.startsWith('/')), 'evidence_refs must be JSON Pointers');
  ok(result.reason.length > 0, 'reason must be present');
}

function assertNotEvaluated(result: SignalResult): void {
  strictEqual(result.state, 'not_evaluated');
  deepStrictEqual([...result.evidenceRefs], []);
}

function assertNotApplicable(result: SignalResult): void {
  strictEqual(result.state, 'not_applicable');
  assertScoredRefs(result);
}

/* --------------------------------------------------------------- AID-01 --- */

describe('AID-01 — answer-first content structure (Type B)', () => {
  const hub = editorial({ hub_present: true });

  it('pass — every sampled informational page leads with an answer', () => {
    const r = aid01([editorialPage(), faqPage()], answerability(2), hub, SOUGHT_ALL, review());
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 2);
    strictEqual(r.itemsSatisfying, 2);
    assertScoredRefs(r);
  });

  it('partial — some but not all informational pages lead with an answer', () => {
    const r = aid01([editorialPage(), faqPage()], answerability(1), hub, SOUGHT_ALL, review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    strictEqual(r.itemsEvaluated, 2);
  });

  it('not_detected — no informational page leads with an answer', () => {
    const r = aid01([editorialPage()], answerability(0), hub, SOUGHT_ALL, review());
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_applicable — CON-05 not_detected (no editorial content)', () => {
    const r = aid01([editorialPage()], answerability(0), editorial({ hub_present: false }), SOUGHT_ALL, review());
    assertNotApplicable(r);
  });

  it('not_evaluated — no reviewer record (Type B)', () => {
    assertNotEvaluated(aid01([editorialPage()], answerability(1), hub, SOUGHT_ALL, undefined));
  });

  it('not_evaluated — editorial not sought, so CON-05 prerequisite is not_evaluated', () => {
    assertNotEvaluated(aid01([editorialPage()], answerability(1), hub, ['home'], review()));
  });

  it('not_evaluated — hub present but no editorial or FAQ pages were sampled', () => {
    assertNotEvaluated(aid01([page({ page_type: 'home' })], answerability(0), hub, SOUGHT_ALL, review()));
  });

  it('crawl.pages supply the denominator; only editorial/faq pages count', () => {
    // Two informational pages among four sampled; pages_with_lead_answer covers them.
    const pages = [page({ page_type: 'home' }), editorialPage(), page({ page_type: 'product' }), faqPage()];
    const r = aid01(pages, answerability(2), hub, SOUGHT_ALL, review());
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 2);
  });
});

/* --------------------------------------------------------------- AID-02 --- */

describe('AID-02 — key facts as text rather than imagery (Type B)', () => {
  const ALL_FACTS: AiEvidence['facts']['facts_in_text'] = ['what_sold', 'materials', 'origin', 'price', 'delivery_terms', 'returns_terms', 'care'];

  it('pass — every L-FACT member is present in text', () => {
    const r = aid02(facts({ facts_in_text: ALL_FACTS }), review());
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 7);
    strictEqual(r.itemsSatisfying, 7);
    assertScoredRefs(r);
  });

  it('partial — some L-FACT members in text', () => {
    const r = aid02(facts({ facts_in_text: ['origin', 'materials'] }), review());
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
  });

  it('not_detected — no L-FACT member in text (image-only facts do not count)', () => {
    const r = aid02(facts({ facts_in_text: [], facts_image_only: ['origin', 'materials'] }), review());
    strictEqual(r.state, 'not_detected');
  });

  it('not_evaluated — no reviewer record (Type B)', () => {
    assertNotEvaluated(aid02(facts({ facts_in_text: ALL_FACTS }), undefined));
  });
});

/* --------------------------------------------------------------- AID-03 --- */

describe('AID-03 — FAQ content and markup (single item, signal-local partial)', () => {
  const sought: SoughtTarget[] = ['faq'];

  it('pass — FAQ content exists and carries FAQPage schema', () => {
    const r = aid03(faq({ faq_pages: ['https://brand.test/faq'], faqpage_schema_present: true }), sought);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — FAQ content without markup', () => {
    strictEqual(aid03(faq({ faq_pages: ['https://brand.test/faq'], faqpage_schema_present: false }), sought).state, 'partial');
  });

  it('partial — markup without substantive content', () => {
    strictEqual(aid03(faq({ faq_pages: [], faqpage_schema_present: true }), sought).state, 'partial');
  });

  it('not_detected — neither content nor markup (faq was sought)', () => {
    const r = aid03(faq({}), sought);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — faq was not sought (§4.4)', () => {
    assertNotEvaluated(aid03(faq({ faq_pages: ['x'], faqpage_schema_present: true }), ['home']));
  });
});

/* --------------------------------------------------------------- AID-06 --- */

describe('AID-06 — semantic relationships (L-RELATION coverage)', () => {
  it('pass — every L-RELATION mechanism present', () => {
    const r = aid06(relationships({ breadcrumbs_present: true, entity_links_present: true, about_mentions_present: true }));
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 3);
    assertScoredRefs(r);
  });

  it('partial — some mechanisms present', () => {
    const r = aid06(relationships({ breadcrumbs_present: true }));
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no mechanism present', () => {
    strictEqual(aid06(relationships({})).state, 'not_detected');
  });
});

/* --------------------------------------------------------------- AID-07 --- */

describe('AID-07 — content available without client-side rendering (L-RAWHTML)', () => {
  const raw = (h1: boolean, body: boolean, fact: boolean): Partial<CrawlPage> => ({
    raw_html_contains: { h1_text: h1, body_text: body, primary_commercial_fact: fact },
  });

  it('pass — every L-RAWHTML element survives in raw HTML on every commercial page', () => {
    const r = aid07([page({ page_type: 'home', ...raw(true, true, true) }), page({ page_type: 'product', ...raw(true, true, true) })], 'both');
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsSatisfying, 3);
    assertScoredRefs(r);
  });

  it('partial — an element survives on some pages but not all', () => {
    // h1 and primary survive everywhere; body fails on the second page → 2 of 3.
    const r = aid07([page({ page_type: 'home', ...raw(true, true, true) }), page({ page_type: 'product', ...raw(true, false, true) })], 'both');
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 2);
  });

  it('fail — no L-RAWHTML element survives in raw HTML (zero state)', () => {
    const r = aid07([page({ page_type: 'home', ...raw(false, false, false) })], 'both');
    strictEqual(r.state, 'fail');
    strictEqual(r.itemsSatisfying, 0);
    assertScoredRefs(r);
  });

  it('not_evaluated — render_mode is not both', () => {
    assertNotEvaluated(aid07([page({ page_type: 'home', ...raw(true, true, true) })], 'raw_html'));
  });

  it('not_evaluated — no sampled commercial page carries raw-HTML evidence', () => {
    // A non-commercial page (cart) and a commercial page without raw_html_contains.
    assertNotEvaluated(aid07([page({ page_type: 'cart', ...raw(true, true, true) }), page({ page_type: 'home' })], 'both'));
  });

  it('non-commercial pages are excluded from the population', () => {
    // The cart page (all false) must not drag the score down; only the home page counts.
    const r = aid07([page({ page_type: 'home', ...raw(true, true, true) }), page({ page_type: 'cart', ...raw(false, false, false) })], 'both');
    strictEqual(r.state, 'pass');
  });
});

/* --------------------------------------------------------------- AID-08 --- */

describe('AID-08 — AI-agent crawl directives (L-AIAGENT is empty rubric data)', () => {
  // While L-AIAGENT is empty (lists.ts / rubric §7), the population has no members, so the
  // only reachable state is not_evaluated (rubric AID-08). pass/partial/fail become
  // reachable only when the list carries members — a §18 version bump — and are therefore
  // not tested here (documented per tests/README §4).

  it('not_evaluated — no robots.txt was retrieved', () => {
    assertNotEvaluated(aid08(robots({ fetched: false }), []));
  });

  it('not_evaluated — robots.txt retrieved but L-AIAGENT has no members to evaluate', () => {
    assertNotEvaluated(aid08(robots({ agent_rules: { '*': 'allow' } }), []));
  });

  it('not_evaluated — even a disallowed agent with an AI-visibility objective (empty L-AIAGENT means no population)', () => {
    // Mirrors the weak fixture: ExampleAIBot disallowed, an AI objective stated. With
    // L-AIAGENT empty, ExampleAIBot is not a recognised member, so AID-08 is not_evaluated.
    const r = aid08(robots({ agent_rules: { '*': 'allow', ExampleAIBot: 'disallow' } }), ['Be found by AI shopping assistants']);
    assertNotEvaluated(r);
  });
});

/* --------------------------------------------------------------- AID-09 --- */

describe('AID-09 — commercial facts as text (L-COMMERCIAL coverage)', () => {
  // not_applicable is listed in §13 but given no trigger by §13 or §14.2, and AID-09 may
  // read only ai.commercial_facts (§8), so it cannot observe a no-catalogue condition. No
  // trigger is invented; the reachable states are pass/partial/not_detected.

  it('pass — every L-COMMERCIAL fact present as text', () => {
    const r = aid09(commercialFacts({ price_in_text: true, shipping_in_text: true, returns_in_text: true }));
    strictEqual(r.state, 'pass');
    strictEqual(r.itemsApplicable, 3);
    assertScoredRefs(r);
  });

  it('partial — some commercial facts present as text', () => {
    const r = aid09(commercialFacts({ price_in_text: true }));
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
  });

  it('not_detected — no commercial fact present as text', () => {
    strictEqual(aid09(commercialFacts({})).state, 'not_detected');
  });
});

/* ---------------------------------------------------- cross-cutting checks --- */

describe('AID signals — evidence-ref discipline and determinism', () => {
  const hub = editorial({ hub_present: true });

  it('every scored result carries JSON-Pointer refs rooted at /ai_discoverability, /crawl, /content or /review', () => {
    const results = [
      aid01([editorialPage()], answerability(1), hub, SOUGHT_ALL, review()),
      aid02(facts({ facts_in_text: ['origin'] }), review()),
      aid03(faq({ faq_pages: ['x'], faqpage_schema_present: true }), ['faq']),
      aid06(relationships({ breadcrumbs_present: true })),
      aid07([page({ page_type: 'home', raw_html_contains: { h1_text: true, body_text: true, primary_commercial_fact: true } })], 'both'),
      aid09(commercialFacts({ price_in_text: true })),
    ];
    for (const r of results) {
      assertScoredRefs(r);
      ok(r.evidenceRefs.every((ref) => /^\/(ai_discoverability|crawl|content|review)\//.test(ref)), `unexpected ref root in: ${r.reason}`);
    }
  });

  it('the same input scores identically twice (determinism)', () => {
    deepStrictEqual(aid01([editorialPage(), faqPage()], answerability(1), hub, SOUGHT_ALL, review()), aid01([editorialPage(), faqPage()], answerability(1), hub, SOUGHT_ALL, review()));
    deepStrictEqual(aid07([page({ page_type: 'home', raw_html_contains: { h1_text: true, body_text: false, primary_commercial_fact: true } })], 'both'), aid07([page({ page_type: 'home', raw_html_contains: { h1_text: true, body_text: false, primary_commercial_fact: true } })], 'both'));
    deepStrictEqual(aid08(robots({ fetched: false }), []), aid08(robots({ fetched: false }), []));
  });
});
