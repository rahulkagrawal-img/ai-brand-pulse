/**
 * Technical SEO signals — Layer 1 derivation tests (tests/README §3).
 *
 * One `describe` per signal, covering every reachable state. Expected states are
 * hand-derived from `scoring-rubric.md` §9, never recorded from the engine
 * (tests/README §4). Each test uses a minimal evidence object built from the factory
 * below — only the fields the signal reads are set; the rest are innocuous defaults.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CrawlOrigin, CrawlPage, RobotsTxt, Sitemap, SoughtTarget } from '../../schema/evidence.ts';
import type { SignalResult } from '../signal.ts';
import { tec02, tec03, tec05, tec06, tec07, tec10, tec11, tec12, tec13 } from './technical.ts';

/* ----------------------------------------------------------- factories --- */

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

function robots(overrides: Partial<RobotsTxt>): RobotsTxt {
  return {
    fetched: true,
    status_code: 200,
    body: '',
    rules: [],
    sitemap_directives: [],
    agent_rules: {},
    ...overrides,
  };
}

function origin(overrides: Partial<CrawlOrigin>): CrawlOrigin {
  return { scheme: 'https', redirect_chain: [], tls_errors: [], ...overrides };
}

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

/* --------------------------------------------------------------- TEC-02 --- */

describe('TEC-02 — crawl directives do not block key paths', () => {
  const home = page({ page_type: 'home', url: 'https://brand.test/' });
  const policy = page({ page_type: 'policy', url: 'https://brand.test/policy/returns' });

  it('pass — no User-agent: * Disallow matches any commercial page', () => {
    const r = tec02(robots({}), [home, policy]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — a Disallow blocks some commercial pages but not others', () => {
    const rules = [{ user_agent: '*', directive: 'disallow' as const, path: '/policy' }];
    const r = tec02(robots({ rules }), [home, policy]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    strictEqual(r.itemsEvaluated, 2);
    assertScoredRefs(r);
  });

  it('fail — Disallow: / for User-agent: * is the population violation', () => {
    const rules = [{ user_agent: '*', directive: 'disallow' as const, path: '/' }];
    const r = tec02(robots({ rules }), [home, policy]);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — every commercial page blocked by specific paths, no Disallow: / (zero state)', () => {
    // Each page is blocked by its own path; without a Disallow: / the zero state fires, not the violation.
    const rules = [
      { user_agent: '*', directive: 'disallow' as const, path: '/policy' },
      { user_agent: '*', directive: 'disallow' as const, path: '/shop' },
    ];
    const shop = page({ page_type: 'collection', url: 'https://brand.test/shop' });
    const r = tec02(robots({ rules }), [shop, policy]);
    strictEqual(r.state, 'fail');
    strictEqual(r.itemsSatisfying, 0);
    assertScoredRefs(r);
  });

  it('not_evaluated — robots.txt could not be retrieved', () => {
    assertNotEvaluated(tec02(robots({ fetched: false }), [home, policy]));
  });

  it('not_evaluated — no sampled commercial pages', () => {
    const cart = page({ page_type: 'cart', url: 'https://brand.test/cart' });
    assertNotEvaluated(tec02(robots({}), [cart]));
  });
});

/* --------------------------------------------------------------- TEC-03 --- */

describe('TEC-03 — XML sitemap discoverable', () => {
  const sought: SoughtTarget[] = ['sitemap'];
  const declaredSitemap = (o: Partial<Sitemap>): Sitemap => ({
    url: 'https://brand.test/sitemap.xml',
    discovered_via: 'robots_txt',
    fetched: true,
    status_code: 200,
    well_formed: true,
    url_count: 10,
    ...o,
  });

  it('pass — a sitemap declared in robots.txt is retrievable and well-formed', () => {
    const r = tec03([declaredSitemap({})], robots({ sitemap_directives: ['https://brand.test/sitemap.xml'] }), sought);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — a sitemap is retrievable at a conventional path but undeclared', () => {
    const conventional = declaredSitemap({ discovered_via: 'conventional_path' });
    const r = tec03([conventional], robots({}), sought);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('partial — a declared sitemap is malformed', () => {
    const malformed = declaredSitemap({ well_formed: false });
    const r = tec03([malformed], robots({ sitemap_directives: ['https://brand.test/sitemap.xml'] }), sought);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('not_detected — no sitemap declared and retrievable and well-formed', () => {
    const r = tec03([], robots({}), sought);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });

  it('not_evaluated — sitemap was not sought (§4.4)', () => {
    assertNotEvaluated(tec03([declaredSitemap({})], robots({}), []));
  });
});

/* --------------------------------------------------------------- TEC-05 --- */

describe('TEC-05 — sampled pages are indexable', () => {
  it('pass — no sampled commercial page carries noindex', () => {
    const r = tec05([page({ page_type: 'home' }), page({ page_type: 'product' })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — a non-product/collection page is noindex, others indexable', () => {
    const about = page({ page_type: 'about', meta_robots: 'noindex, nofollow' });
    const home = page({ page_type: 'home' });
    const r = tec05([about, home]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('fail — a product page carries noindex (violation)', () => {
    const productNoindex = page({ page_type: 'product', x_robots_tag: 'noindex' });
    const productOk = page({ page_type: 'product' });
    const r = tec05([productNoindex, productOk]);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — every commercial page noindex, none a product/collection (zero state)', () => {
    const r = tec05([page({ page_type: 'about', meta_robots: 'noindex' }), page({ page_type: 'policy', meta_robots: 'noindex' })]);
    strictEqual(r.state, 'fail');
    strictEqual(r.itemsSatisfying, 0);
    assertScoredRefs(r);
  });

  it('not_evaluated — no sampled commercial pages', () => {
    assertNotEvaluated(tec05([page({ page_type: 'search' })]));
  });
});

/* --------------------------------------------------------------- TEC-06 --- */

describe('TEC-06 — canonical tags present and self-consistent', () => {
  const originUrl = 'https://brand.test';

  it('pass — every page has one absolute on-host canonical', () => {
    const p1 = page({ canonical_url: 'https://brand.test/a', canonical_count: 1 });
    const p2 = page({ canonical_url: 'https://brand.test/b', canonical_count: 1 });
    const r = tec06([p1, p2], originUrl);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one page canonical, another has none', () => {
    const good = page({ canonical_url: 'https://brand.test/a', canonical_count: 1 });
    const none = page({ canonical_url: null, canonical_count: 0 });
    const r = tec06([good, none], originUrl);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('fail — a page declares more than one canonical (violation)', () => {
    const dup = page({ canonical_url: 'https://brand.test/a', canonical_count: 2 });
    const r = tec06([dup], originUrl);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — a canonical resolves off-host (violation)', () => {
    const off = page({ canonical_url: 'https://other.test/a', canonical_count: 1 });
    const r = tec06([off], originUrl);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — every page points at the origin root, trailing slash normalised (D-5)', () => {
    // Canonicals carry a trailing slash; the origin does not. D-5 normalises before comparing.
    const p1 = page({ url: 'https://brand.test/a', canonical_url: 'https://brand.test/', canonical_count: 1 });
    const p2 = page({ url: 'https://brand.test/b', canonical_url: 'https://brand.test/', canonical_count: 1 });
    const r = tec06([p1, p2], originUrl);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('not_detected — no page declares a canonical', () => {
    const r = tec06([page({ canonical_url: null, canonical_count: 0 }), page({ canonical_url: null, canonical_count: 0 })], originUrl);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });
});

/* --------------------------------------------------------------- TEC-07 --- */

describe('TEC-07 — title tags present and unique', () => {
  it('pass — every page has a distinct non-empty title', () => {
    const r = tec07([page({ title: 'Alpha' }), page({ title: 'Beta' })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one unique title among duplicates', () => {
    const r = tec07([page({ title: 'Same' }), page({ title: 'Same' }), page({ title: 'Unique' })]);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('fail — every page shares one identical title (violation)', () => {
    const r = tec07([page({ title: 'Home' }), page({ title: 'Home' })]);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('not_detected — no page carries a non-empty title', () => {
    const r = tec07([page({ title: null }), page({ title: '   ' })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });
});

/* --------------------------------------------------------------- TEC-10 --- */

describe('TEC-10 — heading structure', () => {
  const wellFormed = [
    { level: 1, text: 'H1', order: 0 },
    { level: 2, text: 'H2', order: 1 },
  ];

  it('pass — every page has one h1 and no skipped levels', () => {
    const r = tec10([page({ headings: wellFormed })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one page well-formed, one skips a level', () => {
    const skips = [
      { level: 1, text: 'H1', order: 0 },
      { level: 3, text: 'H3', order: 1 },
    ];
    const r = tec10([page({ headings: wellFormed }), page({ headings: skips })]);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('not_detected — no page has a well-formed heading tree', () => {
    const twoH1 = [
      { level: 1, text: 'A', order: 0 },
      { level: 1, text: 'B', order: 1 },
    ];
    const r = tec10([page({ headings: [] }), page({ headings: twoH1 })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });
});

/* --------------------------------------------------------------- TEC-11 --- */

describe('TEC-11 — internal reachability within the sample', () => {
  const home = page({ page_type: 'home', url: 'https://brand.test/', internal_links: [] });
  const p1 = page({ page_type: 'product', url: 'https://brand.test/p1', depth_from_home: 1 });
  const p2 = page({ page_type: 'product', url: 'https://brand.test/p2', depth_from_home: 1 });

  it('pass — every commercial non-home page is within depth and linked', () => {
    const linkingHome = page({ page_type: 'home', url: 'https://brand.test/', internal_links: ['https://brand.test/p1', 'https://brand.test/p2'] });
    const r = tec11([linkingHome, p1, p2], 3, 2);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — some linked, some not', () => {
    const linksP1 = page({ page_type: 'home', url: 'https://brand.test/', internal_links: ['https://brand.test/p1'] });
    const r = tec11([linksP1, p1, p2], 3, 2);
    strictEqual(r.state, 'partial');
    strictEqual(r.itemsSatisfying, 1);
    assertScoredRefs(r);
  });

  it('fail — no commercial page is reachable (zero state)', () => {
    const r = tec11([home, p1, p2], 3, 2);
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('not_evaluated — fewer than three pages sampled', () => {
    assertNotEvaluated(tec11([home, p1], 2, 2));
  });

  it('not_evaluated — no commercial pages beyond the homepage', () => {
    const searches = [page({ page_type: 'search' }), page({ page_type: 'search' }), page({ page_type: 'search' })];
    assertNotEvaluated(tec11(searches, 3, 2));
  });
});

/* --------------------------------------------------------------- TEC-12 --- */

describe('TEC-12 — structured data present and parseable', () => {
  const okBlock = { format: 'json-ld', types: ['Product'], parse_ok: true };

  it('pass — every page emits at least one parseable block', () => {
    const r = tec12([page({ structured_data: [okBlock] }), page({ structured_data: [okBlock] })]);
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — one page emits structured data, another does not', () => {
    const r = tec12([page({ structured_data: [okBlock] }), page({ structured_data: [] })]);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('partial — a page carries a block that fails to parse', () => {
    const badBlock = { format: 'json-ld', types: [], parse_ok: false };
    const r = tec12([page({ structured_data: [okBlock] }), page({ structured_data: [badBlock] })]);
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('not_detected — no page emits structured data', () => {
    const r = tec12([page({ structured_data: [] }), page({ structured_data: [] })]);
    strictEqual(r.state, 'not_detected');
    assertScoredRefs(r);
  });
});

/* --------------------------------------------------------------- TEC-13 --- */

describe('TEC-13 — HTTPS and host canonicalisation', () => {
  it('pass — HTTPS on a single, consistent origin', () => {
    const r = tec13(origin({}));
    strictEqual(r.state, 'pass');
    assertScoredRefs(r);
  });

  it('partial — HTTPS with a multi-hop redirect chain terminating cleanly', () => {
    const chain = [
      { from: 'http://brand.test/', to: 'https://brand.test/', status: 301 },
      { from: 'https://brand.test/', to: 'https://www.brand.test/', status: 301 },
    ];
    const r = tec13(origin({ redirect_chain: chain }));
    strictEqual(r.state, 'partial');
    assertScoredRefs(r);
  });

  it('fail — HTTP served with no redirect to HTTPS (violation)', () => {
    const r = tec13(origin({ scheme: 'http' }));
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — a TLS error is present (violation)', () => {
    const r = tec13(origin({ tls_errors: ['certificate expired'] }));
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — two or more host variants return 200 (violation)', () => {
    const r = tec13(origin({ host_variants: { 'https://brand.test/': 200, 'https://www.brand.test/': 200 } }));
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('fail — a lone host variant serves 200 instead of redirecting (zero state)', () => {
    const r = tec13(origin({ host_variants: { 'https://www.brand.test/': 200 } }));
    strictEqual(r.state, 'fail');
    assertScoredRefs(r);
  });

  it('not_evaluated — origin evidence was not collected', () => {
    assertNotEvaluated(tec13(undefined));
  });
});
