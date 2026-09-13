/**
 * Technical SEO — the nine scored Type A signals (Scoring Rubric v1.0 §9).
 *
 * Each function is a PURE derivation: evidence in, `SignalResult` out (audit-spec
 * §7.2, Phase 3 planning D-1). No network, no clock, no LLM, no dependency beyond
 * the §6 aggregation primitive and the declared schema types (engineering-rules §3).
 *
 * Every multi-item signal delegates its state to `aggregateItems` (rubric §6.2) so
 * the branch order is defined once. TEC-03 and TEC-13 are single-item signals whose
 * legitimate `partial` cannot come from item counts; they use the documented
 * signal-local classification (rubric §6.5 exception, Phase 3 planning D-4).
 *
 * `evidence_refs` are JSON Pointers (RFC 6901) into the audit record (D-2). They are
 * non-empty for every state except `not_evaluated`, per audit-spec §7.2.
 *
 * Populations that reference "sampled commercial pages" or "the origin" can be empty
 * only through a collection limitation, never a property of the business, so these
 * signals map an empty/insufficient population to `not_evaluated` (their declared
 * state) rather than `not_applicable`. The sampled-pages signals (TEC-06/07/10/12)
 * assume the audit collected at least one page — always true for a real audit, since
 * the homepage is collected — and their zero state (`not_detected`) covers "no
 * sampled page satisfies".
 */

import type { AggregationResult } from '../aggregation.ts';
import { aggregateItems, type PopulationItem } from '../aggregation.ts';
import type { SignalResult } from '../signal.ts';
import {
  COMMERCIAL_PAGE_TYPES,
  type CrawlOrigin,
  type CrawlPage,
  type RobotsTxt,
  type Sitemap,
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

/** Single-item result (rubric §6.5): A = E = 1, satisfying only when `pass`. */
function single(state: 'pass' | 'partial' | 'fail' | 'not_detected', evidenceRefs: string[], reason: string): SignalResult {
  return { state, itemsApplicable: 1, itemsEvaluated: 1, itemsSatisfying: state === 'pass' ? 1 : 0, evidenceRefs, reason };
}

/**
 * Reason text for a multi-item aggregate. The `partial` case states the proportion
 * from the recorded counts; those are data, not scoring thresholds.
 */
function reasonFor(agg: AggregationResult, thing: string, pass: string, zero: string, fail = zero): string {
  switch (agg.state) {
    case 'pass': return pass;
    case 'partial': return `${agg.itemsSatisfying} of ${agg.itemsEvaluated} ${thing}`;
    case 'fail': return fail;
    case 'not_detected': return zero;
    default: return zero;
  }
}

function scored(agg: AggregationResult, evidenceRefs: string[], reason: string): SignalResult {
  return { ...agg, evidenceRefs, reason };
}

/** Pathname of an absolute URL; falls back to the raw value for a bare path. */
function urlPath(rawUrl: string): string {
  try { return new URL(rawUrl).pathname || '/'; } catch { return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`; }
}

function tryUrl(u: string): URL | null {
  try { return new URL(u); } catch { return null; }
}

function hostOf(u: string): string | null {
  const parsed = tryUrl(u);
  return parsed ? parsed.host.toLowerCase() : null;
}

/** Strip a single trailing slash for origin-root comparison (D-5). */
function stripTrailingSlash(u: string): string {
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

/**
 * robots.txt path matching: prefix by default, `*` matches any run, a trailing `$`
 * anchors the end. An empty `Disallow` path matches nothing (it means "allow all").
 * Iterative (ReDoS-free) and deterministic.
 */
function robotsPathMatches(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  const anchoredEnd = pattern.endsWith('$');
  const body = anchoredEnd ? pattern.slice(0, -1) : pattern;
  const segments = body.split('*');
  let pos = 0;
  for (const [i, seg] of segments.entries()) {
    if (seg === '') continue; // leading, trailing, or consecutive '*'
    if (i === 0) {
      if (!path.startsWith(seg)) return false;
      pos = seg.length;
    } else {
      const idx = path.indexOf(seg, pos);
      if (idx === -1) return false;
      pos = idx + seg.length;
    }
  }
  // With an end anchor and a non-'*' final segment, the match must reach the end.
  if (anchoredEnd && !body.endsWith('*') && pos !== path.length) return false;
  return true;
}

/* --------------------------------------------------------------- TEC-02 --- */

/**
 * TEC-02 — Crawl directives do not block key paths (§9). Population: sampled
 * commercial pages. A page satisfies when no `User-agent: *` `Disallow` matches its
 * path. `Disallow: /` for `*` is the population violation. `site.key_paths` is
 * context only and is not read here (D-6). robots.txt that could not be retrieved
 * yields `not_evaluated`; a fetched-but-empty robots.txt allows all, hence `pass`.
 */
export function tec02(robots: RobotsTxt, pages: readonly CrawlPage[]): SignalResult {
  if (!robots.fetched) return notEvaluated('robots.txt could not be retrieved; crawl directives were not evaluated');

  const commercial = pages.map((p, i) => ({ p, i })).filter((x) => isCommercial(x.p));
  if (commercial.length === 0) return notEvaluated('no sampled commercial pages to evaluate crawl directives against');

  const starDisallows = robots.rules.filter((r) => r.user_agent === '*' && r.directive === 'disallow');
  const blanketDisallow = starDisallows.some((r) => r.path === '/');

  const items: PopulationItem[] = commercial.map(({ p }) => {
    const path = urlPath(p.url);
    const blocked = starDisallows.some((r) => robotsPathMatches(r.path, path));
    return { applicable: true, evaluable: true, satisfying: !blocked };
  });

  const agg = aggregateItems(items, { zeroState: 'fail', populationViolation: blanketDisallow });
  const refs = [ptr('crawl', 'robots_txt', 'rules'), ...commercial.map(({ i }) => ptr('crawl', 'pages', i))];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled commercial pages are not blocked from crawlers', 'no sampled commercial page is blocked by a User-agent: * Disallow', 'sampled commercial pages are blocked from crawlers'),
  );
}

/* --------------------------------------------------------------- TEC-03 --- */

/**
 * TEC-03 — XML sitemap discoverable (§9). Single item. Sought-gated: if `sitemap`
 * is absent from `crawl.sought[]` the state is `not_evaluated` (§4.4). `partial` is a
 * signal-local classification (§6.5 exception, D-4): a sitemap retrievable at a
 * conventional location but undeclared, or declared but malformed.
 */
export function tec03(sitemaps: readonly Sitemap[], robots: RobotsTxt, sought: readonly SoughtTarget[]): SignalResult {
  if (!sought.includes('sitemap')) return notEvaluated('sitemap was not among crawl.sought[]; discoverability was not assessed');

  const declared = (s: Sitemap): boolean => s.discovered_via === 'robots_txt' || robots.sitemap_directives.includes(s.url);
  const directivesRef = ptr('crawl', 'robots_txt', 'sitemap_directives');

  const passIdx = sitemaps.findIndex((s) => declared(s) && s.fetched && s.well_formed);
  if (passIdx >= 0) {
    return single('pass', [ptr('crawl', 'sitemaps', passIdx), directivesRef], 'a sitemap is declared in robots.txt and is retrievable and well-formed');
  }

  const undeclaredIdx = sitemaps.findIndex((s) => s.discovered_via === 'conventional_path' && s.fetched && s.well_formed && !declared(s));
  if (undeclaredIdx >= 0) {
    return single('partial', [ptr('crawl', 'sitemaps', undeclaredIdx), directivesRef], 'a sitemap is retrievable at a conventional location but is not declared in robots.txt');
  }

  const malformedIdx = sitemaps.findIndex((s) => declared(s) && s.fetched && !s.well_formed);
  if (malformedIdx >= 0) {
    return single('partial', [ptr('crawl', 'sitemaps', malformedIdx), directivesRef], 'a sitemap is declared in robots.txt but is malformed');
  }

  return single('not_detected', [directivesRef, ptr('crawl', 'sitemaps')], 'no sitemap is both declared in robots.txt and retrievable and well-formed');
}

/* --------------------------------------------------------------- TEC-05 --- */

/**
 * TEC-05 — Sampled pages are indexable (§9). Population: sampled commercial pages.
 * A page satisfies when neither the meta robots tag nor the `X-Robots-Tag` header
 * contains `noindex`. A `noindex` on a product or collection page is the violation.
 */
export function tec05(pages: readonly CrawlPage[]): SignalResult {
  const commercial = pages.map((p, i) => ({ p, i })).filter((x) => isCommercial(x.p));
  if (commercial.length === 0) return notEvaluated('no sampled commercial pages to assess indexability');

  const items: PopulationItem[] = commercial.map(({ p }) => {
    const noindex = containsNoindex(p.meta_robots) || containsNoindex(p.x_robots_tag);
    const productOrCollection = p.page_type === 'product' || p.page_type === 'collection';
    return { applicable: true, evaluable: true, satisfying: !noindex, violation: noindex && productOrCollection };
  });

  const agg = aggregateItems(items, { zeroState: 'fail' });
  const refs = commercial.flatMap(({ i }) => [ptr('crawl', 'pages', i, 'meta_robots'), ptr('crawl', 'pages', i, 'x_robots_tag')]);
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled commercial pages are indexable', 'every sampled commercial page is indexable', 'no sampled commercial page is indexable', 'a sampled page carries noindex (a product or collection page fires the violation)'),
  );
}

/** Case-insensitive `noindex` token check. `toLowerCase` is locale-independent for ASCII. */
function containsNoindex(value: string | null): boolean {
  return value != null && value.toLowerCase().includes('noindex');
}

/* --------------------------------------------------------------- TEC-06 --- */

/**
 * TEC-06 — Canonical tags present and self-consistent (§9). Population: sampled
 * pages. Satisfies when exactly one canonical that is absolute and on-host. Violates
 * on `canonical_count > 1`, an off-host canonical, or every page pointing at the
 * origin root (page_count > 1). Trailing slashes are normalised before the origin-root
 * comparison (D-5). Zero state `not_detected`.
 */
export function tec06(pages: readonly CrawlPage[], normalisedOrigin: string): SignalResult {
  const originHost = hostOf(normalisedOrigin);

  const items: PopulationItem[] = pages.map((p) => {
    let violation = p.canonical_count > 1;
    let satisfying = false;
    if (p.canonical_url != null) {
      const abs = tryUrl(p.canonical_url);
      const offHost = abs != null && hostOf(p.canonical_url) !== originHost;
      if (offHost) violation = true;
      satisfying = p.canonical_count === 1 && abs != null && !offHost;
    }
    return { applicable: true, evaluable: true, satisfying, violation };
  });

  const agg = aggregateItems(items, { zeroState: 'not_detected', populationViolation: allCanonicalsEqualOriginRoot(pages, normalisedOrigin) });
  const refs = [ptr('site', 'normalised_origin'), ...pages.map((_, i) => ptr('crawl', 'pages', i, 'canonical_url'))];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled pages carry one self-consistent canonical', 'every sampled page carries one self-consistent, on-host canonical', 'no sampled page carries a self-consistent canonical', 'a canonical violation fired (duplicate, off-host, or every page pointing at the origin root)'),
  );
}

function allCanonicalsEqualOriginRoot(pages: readonly CrawlPage[], normalisedOrigin: string): boolean {
  if (pages.length <= 1) return false;
  const root = stripTrailingSlash(normalisedOrigin);
  let shared: string | null = null;
  for (const p of pages) {
    if (p.canonical_url == null) return false;
    const normalised = stripTrailingSlash(p.canonical_url);
    if (shared === null) shared = normalised;
    else if (shared !== normalised) return false;
  }
  return shared !== null && shared === root;
}

/* --------------------------------------------------------------- TEC-07 --- */

/**
 * TEC-07 — Title tags present and unique (§9). Population: sampled pages. A page
 * satisfies when its whitespace-normalised title is non-empty and shared by no other
 * sampled page. Every page sharing one identical non-empty title (page_count > 1) is
 * the violation. Zero state `not_detected`.
 */
export function tec07(pages: readonly CrawlPage[]): SignalResult {
  const titles = pages.map((p) => normaliseWhitespace(p.title));
  const counts = new Map<string, number>();
  for (const t of titles) if (t !== '') counts.set(t, (counts.get(t) ?? 0) + 1);

  const items: PopulationItem[] = titles.map((t) => ({
    applicable: true,
    evaluable: true,
    satisfying: t !== '' && counts.get(t) === 1,
  }));

  const first = titles[0];
  const violation = pages.length > 1 && first !== undefined && first !== '' && titles.every((t) => t === first);
  const agg = aggregateItems(items, { zeroState: 'not_detected', populationViolation: violation });
  const refs = pages.map((_, i) => ptr('crawl', 'pages', i, 'title'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled pages carry a distinct, non-empty title', 'every sampled page carries a distinct, non-empty title', 'no sampled page carries a non-empty title', 'every sampled page shares one identical title'),
  );
}

/** Trim and collapse internal whitespace runs. Byte-comparable afterwards. */
function normaliseWhitespace(value: string | null): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

/* --------------------------------------------------------------- TEC-10 --- */

/**
 * TEC-10 — Heading structure (§9). Population: sampled pages. A page satisfies with
 * exactly one `h1` and no heading skipping more than one level below its predecessor
 * in document order. No violation; `fail` is unreachable and not declared (D-3). Zero
 * state `not_detected`.
 */
export function tec10(pages: readonly CrawlPage[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: headingsWellFormed(p.headings),
  }));

  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = pages.map((_, i) => ptr('crawl', 'pages', i, 'headings'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled pages have a well-formed heading structure', 'every sampled page has a well-formed heading structure', 'no sampled page has a well-formed heading structure'),
  );
}

function headingsWellFormed(headings: CrawlPage['headings']): boolean {
  const ordered = [...headings].sort((a, b) => a.order - b.order);
  const h1Count = ordered.filter((h) => h.level === 1).length;
  if (h1Count !== 1) return false;
  let previousLevel: number | null = null;
  for (const h of ordered) {
    if (previousLevel !== null && h.level - previousLevel > 1) return false;
    previousLevel = h.level;
  }
  return true;
}

/* --------------------------------------------------------------- TEC-11 --- */

/**
 * TEC-11 — Internal reachability within the sample (§9). Population: sampled
 * commercial pages other than the homepage. A page satisfies when it is within the
 * crawl depth and at least one other sampled page links to it. `not_evaluated` when
 * fewer than three pages were sampled (Limits) or no such page was sampled — both are
 * collection limitations, not site properties. Zero state `fail`.
 */
export function tec11(pages: readonly CrawlPage[], pageCount: number, maxDepth: number): SignalResult {
  if (pageCount < 3) return notEvaluated('fewer than three pages were sampled; internal reachability was not assessed');

  const population = pages.map((p, i) => ({ p, i })).filter((x) => isCommercial(x.p) && x.p.page_type !== 'home');
  if (population.length === 0) return notEvaluated('no sampled commercial pages beyond the homepage to assess reachability');

  const items: PopulationItem[] = population.map(({ p, i }) => {
    const withinDepth = p.depth_from_home != null && p.depth_from_home <= maxDepth;
    const linkedFromOther = pages.some((other, j) => j !== i && other.internal_links.includes(p.url));
    return { applicable: true, evaluable: true, satisfying: withinDepth && linkedFromOther };
  });

  const agg = aggregateItems(items, { zeroState: 'fail' });
  const refs = population.map(({ i }) => ptr('crawl', 'pages', i));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled commercial pages are reachable within the sample', 'every sampled commercial page is reachable within the sample', 'no sampled commercial page is reachable within the sample'),
  );
}

/* --------------------------------------------------------------- TEC-12 --- */

/**
 * TEC-12 — Structured data present and parseable (§9). Population: sampled pages. A
 * page satisfies when it carries at least one structured-data block and every block
 * parses. No violation; `fail` is unreachable and not declared (D-3). Zero state
 * `not_detected`.
 */
export function tec12(pages: readonly CrawlPage[]): SignalResult {
  const items: PopulationItem[] = pages.map((p) => ({
    applicable: true,
    evaluable: true,
    satisfying: p.structured_data.length > 0 && p.structured_data.every((b) => b.parse_ok === true),
  }));

  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = pages.map((_, i) => ptr('crawl', 'pages', i, 'structured_data'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled pages emit parseable structured data', 'every sampled page emits parseable structured data', 'no sampled page emits parseable structured data'),
  );
}

/* --------------------------------------------------------------- TEC-13 --- */

/**
 * TEC-13 — HTTPS and host canonicalisation (§9). Single item — the origin. Violates
 * on HTTP served with no redirect to HTTPS, any TLS error, or two or more host
 * variants returning 200. `partial` is a signal-local classification (§6.5 exception,
 * D-4): HTTPS is served and TLS is clean, but the redirect chain terminates at the
 * preferred origin over multiple hops rather than resolving directly. `not_evaluated`
 * when the origin evidence was not collected (audit-spec §4.2). Zero state `fail`.
 */
export function tec13(origin: CrawlOrigin | undefined): SignalResult {
  if (origin == null) return notEvaluated('origin evidence was not collected; HTTPS and host canonicalisation were not assessed');

  const refs = [ptr('crawl', 'origin')];
  const tlsClean = origin.tls_errors.length === 0;
  const chainRedirectsToHttps = origin.redirect_chain.some((hop) => /^https:/i.test(hop.to));
  const variantStatuses = Object.values(origin.host_variants ?? {});
  const liveVariants = variantStatuses.filter((s) => s === 200).length;
  const variantsAllRedirect = variantStatuses.every((s) => s >= 300 && s < 400);

  if ((origin.scheme === 'http' && !chainRedirectsToHttps) || !tlsClean || liveVariants >= 2) {
    return single('fail', refs, 'a host/HTTPS violation fired (HTTP with no HTTPS redirect, a TLS error, or two or more live host variants)');
  }

  if (origin.scheme === 'https' && tlsClean && variantsAllRedirect) {
    return origin.redirect_chain.length <= 1
      ? single('pass', refs, 'HTTPS is served on a single, consistent origin')
      : single('partial', refs, 'HTTPS is served and redirects terminate at the preferred origin over multiple hops');
  }

  return single('fail', refs, 'the origin does not resolve to a single secure canonical origin');
}
