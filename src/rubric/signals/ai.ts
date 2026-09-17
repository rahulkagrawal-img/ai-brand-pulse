/**
 * AI Discoverability Readiness — the seven scored signals (Scoring Rubric v1.0 §13).
 *
 * Five are Type A (deterministic): AID-03, AID-06, AID-07, AID-08, AID-09.
 * Two are Type B (reviewer-assessed): AID-01, AID-02.
 *
 * Each function is a PURE derivation: evidence in, `SignalResult` out (audit-spec §7.2,
 * Phase 3 planning D-1). No network, no clock, no LLM, no dependency beyond the §6
 * aggregation primitive and the declared schema types (engineering-rules §3).
 *
 * TYPE B signals (AID-01, AID-02) NEVER read a language model and NEVER infer a state
 * (engineering-rules §4). Their input is the reviewer record keyed by signal ID in
 * `review` (audit-spec §5b). With no reviewer record the signal is `not_evaluated`
 * (rubric §2) — never zero, never guessed.
 *
 * `evidence_refs` are JSON Pointers (RFC 6901) into the audit record (D-2), non-empty for
 * every state except `not_evaluated` (audit-spec §7.2). AI evidence lives under
 * `/ai_discoverability/evidence/…`; some signals also read `/crawl/…` for their
 * population or gate (AID-01's sampled-page denominator, AID-07's raw HTML, AID-08's
 * robots.txt) and `/review/…` for the Type B reviewer record, exactly as the Population
 * and Evidence lines of §13 require.
 */

import type { AggregationResult } from '../aggregation.ts';
import { aggregate, aggregateItems, type PopulationItem } from '../aggregation.ts';
import type { SignalResult } from '../signal.ts';
import { L_AIAGENT, L_COMMERCIAL, L_FACT, L_RAWHTML, L_RELATION } from '../lists.ts';
import {
  COMMERCIAL_PAGE_TYPES,
  type AiEvidence,
  type CrawlPage,
  type EditorialEvidence,
  type ReviewRecord,
  type RobotsTxt,
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

/** `not_applicable` result (rubric §4.3): excluded from scoring; carries the observed refs. */
function notApplicable(evidenceRefs: string[], reason: string): SignalResult {
  return { state: 'not_applicable', itemsApplicable: 0, itemsEvaluated: 0, itemsSatisfying: 0, evidenceRefs, reason };
}

/** Single-item result (rubric §6.5): A = E = 1, satisfying only when `pass`. */
function single(state: 'pass' | 'partial' | 'not_detected', evidenceRefs: string[], reason: string): SignalResult {
  return { state, itemsApplicable: 1, itemsEvaluated: 1, itemsSatisfying: state === 'pass' ? 1 : 0, evidenceRefs, reason };
}

function scored(agg: AggregationResult, evidenceRefs: string[], reason: string): SignalResult {
  return { ...agg, evidenceRefs, reason };
}

/** Reason text for a multi-item aggregate; `partial` states the proportion from the counts. */
function reasonFor(agg: AggregationResult, thing: string, pass: string, zero: string, fail = zero): string {
  switch (agg.state) {
    case 'pass': return pass;
    case 'partial': return `${agg.itemsSatisfying} of ${agg.itemsEvaluated} ${thing}`;
    case 'fail': return fail;
    default: return zero; // not_detected zero state
  }
}

/**
 * CON-05 editorial-hub presence, the prerequisite AID-01 depends on (rubric §14.2).
 * Sought-gated on `editorial` (§4.4): a hub not looked for is `not_evaluated`. Mirrors
 * the private helper in `content.ts`; kept local so the signals stay independent
 * (engineering-rules §1, "abstract at the third").
 */
function editorialHubState(editorial: EditorialEvidence, sought: readonly SoughtTarget[]): 'pass' | 'not_detected' | 'not_evaluated' {
  if (!sought.includes('editorial')) return 'not_evaluated';
  return editorial.hub_present ? 'pass' : 'not_detected';
}

/* --------------------------------------------------------------- AID-01 --- */

/**
 * AID-01 — Answer-first content structure (§13). **Type B — reviewer-assessed.**
 * Population: sampled editorial and FAQ pages (the `crawl.pages[]` entries of page_type
 * `editorial` or `faq` — the "sampled … pages" the Population line names; the Evidence
 * line lists the reviewer-populated satisfaction data). A page satisfies when the reviewer
 * records a direct lead answer; `ai.answerability.pages_with_lead_answer` is that count.
 *
 * With no reviewer record the signal is `not_evaluated` (rubric §2). `not_applicable` when
 * CON-05 is `not_detected` (no editorial content to be answer-first about, §14.2); if the
 * CON-05 prerequisite is itself `not_evaluated` (editorial not sought) the signal is
 * `not_evaluated` (§4.2). Zero state `not_detected`. States: `pass` · `partial` ·
 * `not_detected` · `not_applicable` · `not_evaluated`.
 */
export function aid01(
  pages: readonly CrawlPage[],
  answerability: AiEvidence['answerability'],
  editorial: EditorialEvidence,
  sought: readonly SoughtTarget[],
  review: ReviewRecord | undefined,
): SignalResult {
  if (review === undefined) return notEvaluated('AID-01 has no reviewer record; a Type B signal is not_evaluated without one');

  const prereq = editorialHubState(editorial, sought);
  if (prereq === 'not_evaluated') return notEvaluated('CON-05 is not_evaluated (editorial was not sought); answer-first structure was not assessed');
  if (prereq === 'not_detected') return notApplicable([ptr('review', 'AID-01'), ptr('content', 'evidence', 'editorial', 'hub_present')], 'no editorial content (CON-05 not_detected); there is nothing to be answer-first about');

  const informational = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.page_type === 'editorial' || p.page_type === 'faq');
  if (informational.length === 0) {
    return notEvaluated('an editorial hub is present but no editorial or FAQ pages were sampled; answer-first structure was not assessed');
  }

  const n = informational.length;
  const s = answerability.pages_with_lead_answer;
  const agg = aggregate({ applicable: n, evaluable: n, satisfying: s, violation: false, zeroState: 'not_detected' });
  const refs = [ptr('review', 'AID-01'), ptr('ai_discoverability', 'evidence', 'answerability', 'pages_with_lead_answer'), ...informational.map(({ i }) => ptr('crawl', 'pages', i))];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'sampled informational pages lead with a direct answer', 'every sampled editorial or FAQ page leads with a direct answer', 'no sampled editorial or FAQ page leads with a direct answer'),
  );
}

/* --------------------------------------------------------------- AID-02 --- */

/**
 * AID-02 — Key facts as text rather than imagery (§13). **Type B — reviewer-assessed.**
 * Population: `L-FACT` (7 members). A fact satisfies when the reviewer records it present
 * in extractable text (`ai.facts.facts_in_text[]`). With no reviewer record the signal is
 * `not_evaluated` (rubric §2). Every fact always applies, so there is no `not_applicable`.
 * Zero state `not_detected`. Fact names match `L-FACT` exactly (§6.4). States: `pass` ·
 * `partial` · `not_detected` · `not_evaluated`.
 */
export function aid02(facts: AiEvidence['facts'], review: ReviewRecord | undefined): SignalResult {
  if (review === undefined) return notEvaluated('AID-02 has no reviewer record; a Type B signal is not_evaluated without one');

  const inText = new Set<string>(facts.facts_in_text);
  const items: PopulationItem[] = L_FACT.map((fact) => ({ applicable: true, evaluable: true, satisfying: inText.has(fact) }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('review', 'AID-02'), ptr('ai_discoverability', 'evidence', 'facts', 'facts_in_text')];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-FACT members are present as extractable text', 'every L-FACT member is present as extractable text', 'no L-FACT member is present as extractable text'),
  );
}

/* --------------------------------------------------------------- AID-03 --- */

/**
 * AID-03 — FAQ content and markup (§13). Population: one item — the site. Satisfies when
 * FAQ content exists (`ai.faq.faq_pages[]` non-empty) AND carries `FAQPage` structured
 * data (`faqpage_schema_present`). Sought-gated on `faq` (§4.4): `not_evaluated` if `faq`
 * is absent from `crawl.sought[]`.
 *
 * `partial` is a **signal-local classification** of this single item (structurally the
 * same as TEC-03's, rubric §6.5): FAQ content without markup, OR markup without content.
 * Zero state `not_detected`. States: `pass` · `partial` · `not_detected` · `not_evaluated`.
 */
export function aid03(faq: AiEvidence['faq'], sought: readonly SoughtTarget[]): SignalResult {
  if (!sought.includes('faq')) return notEvaluated('faq was not among crawl.sought[]; FAQ content and markup were not assessed');

  const contentExists = faq.faq_pages.length > 0;
  const schemaPresent = faq.faqpage_schema_present;
  const refs = [ptr('ai_discoverability', 'evidence', 'faq', 'faq_pages'), ptr('ai_discoverability', 'evidence', 'faq', 'faqpage_schema_present')];

  if (contentExists && schemaPresent) return single('pass', refs, 'FAQ content exists and carries FAQPage structured data');
  if (contentExists) return single('partial', refs, 'FAQ content exists but carries no FAQPage structured data');
  if (schemaPresent) return single('partial', refs, 'FAQPage structured data is present but no substantive FAQ content was detected');
  return single('not_detected', refs, 'no FAQ content or FAQPage structured data was detected in the pages reviewed');
}

/* --------------------------------------------------------------- AID-06 --- */

/**
 * AID-06 — Semantic relationships (§13). Population: `L-RELATION` (3 members). A mechanism
 * satisfies when present anywhere in the sample (`ai.relationships.<member>_present`). No
 * violation; zero state `not_detected`. A declared-list signal (§6.4) whose members always
 * apply, so there is no `not_applicable` or `not_evaluated`. States: `pass` · `partial` ·
 * `not_detected`.
 */
export function aid06(relationships: AiEvidence['relationships']): SignalResult {
  const items: PopulationItem[] = L_RELATION.map((rel) => ({
    applicable: true,
    evaluable: true,
    satisfying: relationships[`${rel}_present`] === true,
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = L_RELATION.map((rel) => ptr('ai_discoverability', 'evidence', 'relationships', `${rel}_present`));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-RELATION mechanisms are present in the sample', 'every L-RELATION mechanism is present in the sample', 'no L-RELATION mechanism is present in the sample'),
  );
}

/* --------------------------------------------------------------- AID-07 --- */

/**
 * AID-07 — Content available without client-side rendering (§13). Population: `L-RAWHTML`
 * (3 members), assessed across sampled commercial pages. An element satisfies when it is
 * present in the raw HTML response on every sampled commercial page that carries raw-HTML
 * evidence (`crawl.pages[].raw_html_contains.<element>`). Requires `render_mode = both`;
 * otherwise `not_evaluated` (§14.2). `not_evaluated` also when no sampled commercial page
 * carries raw-HTML evidence — a collection limitation, not a site property. No violation;
 * zero state `fail`. States: `pass` · `partial` · `fail` · `not_evaluated`.
 *
 * The evidence records only raw-HTML presence per element; there is no separate
 * rendered-presence flag, so "present in raw on every page where present in rendered" is
 * evaluated as "present in raw on every sampled commercial page that carries the evidence"
 * — the observable form the schema supports.
 */
export function aid07(pages: readonly CrawlPage[], renderMode: 'raw_html' | 'rendered' | 'both'): SignalResult {
  if (renderMode !== 'both') return notEvaluated('render_mode is not "both"; raw-HTML availability could not be compared');

  const withRaw = pages.map((p, i) => ({ p, i })).filter(({ p }) => isCommercial(p) && p.raw_html_contains !== undefined);
  if (withRaw.length === 0) return notEvaluated('no sampled commercial page carries raw-HTML evidence to assess');

  const items: PopulationItem[] = L_RAWHTML.map((element) => ({
    applicable: true,
    evaluable: true,
    satisfying: withRaw.every(({ p }) => p.raw_html_contains![element] === true),
  }));
  const agg = aggregateItems(items, { zeroState: 'fail' });
  const refs = withRaw.map(({ i }) => ptr('crawl', 'pages', i, 'raw_html_contains'));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-RAWHTML elements survive in the raw HTML across sampled commercial pages', 'every L-RAWHTML element survives in the raw HTML on every sampled commercial page', 'no L-RAWHTML element survives in the raw HTML across sampled commercial pages'),
  );
}

/* --------------------------------------------------------------- AID-08 --- */

/**
 * AID-08 — AI-agent crawl directives (§13). Population: `L-AIAGENT` members appearing in
 * `robots.txt` (`crawl.robots_txt.agent_rules{}`). An agent satisfies when it is not
 * disallowed. Violation: the site disallows one or more members AND `site.stated_objectives`
 * includes an AI-visibility objective (blocking alone is never `fail`; it is `partial` with
 * an informational finding). Zero state `partial` — the deliberately unusual state noted in
 * the rubric.
 *
 * `not_evaluated` when no `robots.txt` was retrieved, and — critically — when `L-AIAGENT`
 * has no members to evaluate. `L-AIAGENT` is empty rubric data (lists.ts / rubric §7), and
 * the rubric's resolution is explicit: AID-08 is `not_evaluated`, NOT `not_applicable` (the
 * rule still applies to the site) and NOT `pass` (§7; Phase 3 planning). Supplying members
 * is a §18 version bump. **While `L-AIAGENT` is empty the population is empty, so the
 * pass/partial/fail classification below is unreachable** and is retained only so the signal
 * is correct once the list carries members. States: `pass` · `partial` · `fail` ·
 * `not_evaluated`.
 */
export function aid08(robots: RobotsTxt, statedObjectives: readonly string[]): SignalResult {
  if (!robots.fetched) return notEvaluated('no robots.txt was retrieved; AI-agent crawl directives were not assessed');

  const members = L_AIAGENT.filter((agent) => Object.prototype.hasOwnProperty.call(robots.agent_rules, agent));
  if (members.length === 0) {
    return notEvaluated('L-AIAGENT carries no members present in robots.txt; the audit lacks the rubric data to run AID-08');
  }

  // --- Unreachable while L-AIAGENT is empty (rubric §7 / §18). ---
  const applicable = members.length;
  const satisfying = members.filter((m) => robots.agent_rules[m] !== 'disallow').length;
  const anyDisallowed = satisfying < applicable;
  const violation = anyDisallowed && objectivesIncludeAiVisibility(statedObjectives);
  const refs = [ptr('crawl', 'robots_txt', 'agent_rules'), ptr('site', 'stated_objectives')];

  if (violation) {
    return { state: 'fail', itemsApplicable: applicable, itemsEvaluated: applicable, itemsSatisfying: satisfying, evidenceRefs: refs, reason: 'the site disallows an L-AIAGENT member from commercial paths and states an AI-visibility objective' };
  }
  if (satisfying === applicable) {
    return { state: 'pass', itemsApplicable: applicable, itemsEvaluated: applicable, itemsSatisfying: satisfying, evidenceRefs: refs, reason: 'no evaluated L-AIAGENT member is disallowed from commercial paths' };
  }
  // Zero state and mixed case are both `partial`: blocking alone is never `fail` (rubric AID-08).
  return { state: 'partial', itemsApplicable: applicable, itemsEvaluated: applicable, itemsSatisfying: satisfying, evidenceRefs: refs, reason: 'the site disallows one or more L-AIAGENT members from commercial paths' };
}

/**
 * Whether `site.stated_objectives` includes an AI-visibility objective (AID-08's violation
 * gate). The rubric provides no deterministic classifier for the human-supplied objective
 * strings and forbids inferring one (rubric AID-08: "a human-supplied fact, never an
 * inference"). This determination is therefore not specifiable here without inventing a
 * rule; it returns `false`, which — matching the rubric's protective default that blocking
 * "is never `fail`" absent a contradicted objective — degrades the violation to `partial`.
 * It is unreachable while `L-AIAGENT` is empty; a future rubric version that supplies
 * members must also specify this classifier.
 */
function objectivesIncludeAiVisibility(_statedObjectives: readonly string[]): boolean {
  return false;
}

/* --------------------------------------------------------------- AID-09 --- */

/**
 * AID-09 — Commercial facts as text (§13). Population: `L-COMMERCIAL` (3 members). A fact
 * satisfies when present as an extractable text node (`ai.commercial_facts.<member>_in_text`).
 * No violation; zero state `not_detected`. A declared-list signal (§6.4) whose members
 * always apply.
 *
 * The rubric lists `not_applicable` among AID-09's states, but neither §13 nor §14.2 gives
 * a condition that produces it, and AID-09 may read only `ai.commercial_facts` (§8) — so it
 * cannot observe a no-catalogue condition. No `not_applicable` trigger is invented here;
 * the reachable states are `pass` · `partial` · `not_detected`.
 */
export function aid09(commercialFacts: AiEvidence['commercial_facts']): SignalResult {
  const items: PopulationItem[] = L_COMMERCIAL.map((fact) => ({
    applicable: true,
    evaluable: true,
    satisfying: commercialFacts[`${fact}_in_text`] === true,
  }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = L_COMMERCIAL.map((fact) => ptr('ai_discoverability', 'evidence', 'commercial_facts', `${fact}_in_text`));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-COMMERCIAL facts are present as extractable text', 'every L-COMMERCIAL fact is present as extractable text', 'no L-COMMERCIAL fact is present as extractable text'),
  );
}
