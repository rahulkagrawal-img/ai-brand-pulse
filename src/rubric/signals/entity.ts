/**
 * Entity & Trust — scored signals (Scoring Rubric v1.0 §11).
 *
 * Seven Type A (deterministic): ENT-01, ENT-02, ENT-03, ENT-05, ENT-06, ENT-07, ENT-09.
 * Two Type B (reviewer-assessed): ENT-04, ENT-10.
 *
 * **ENT-06 implements the locked ruling** that resolved its earlier deferral. Its
 * name sources are `entity.consistency.name_variants[]` + `Organization.name` only —
 * `crawl.pages[].title` is provenance/context and is never read for a brand name. An
 * occurrence is a value FROM a declared source, counted before deduplication (so a
 * single-entry variant list plus `Organization.name` is two comparable occurrences,
 * not one); `logo_alt` is compared against the normalised `Organization.name`; a
 * component with fewer than two comparable occurrences is not evaluable; and the four
 * components aggregate through the §6.2 primitive with zero state `fail`. See ent06.
 *
 * Each function is a PURE derivation: evidence in, `SignalResult` out (audit-spec §7.2,
 * Phase 3 planning D-1). No network, no clock, no LLM, no dependency beyond the §6
 * aggregation primitive and the declared schema types (engineering-rules §3).
 *
 * TYPE B signals (ENT-04, ENT-10) never read a language model and never infer a state
 * (engineering-rules §4). Their input is the reviewer record keyed by signal ID in
 * `review` (audit-spec §5b). With no reviewer record the signal is `not_evaluated` —
 * never zero, never guessed (rubric §2). The reviewer/… fields the record must then
 * carry (audit-spec §7.2) are added by the review/assembly layer, not here.
 *
 * `evidence_refs` are JSON Pointers (RFC 6901) into the audit record (D-2), non-empty
 * for every state except `not_evaluated` (audit-spec §7.2). Entity evidence lives under
 * `/entity/evidence/…`; ENT-01/ENT-02 additionally read `/crawl/pages` for the
 * structured-data presence check, which is the evidence the rubric names for ENT-01.
 */

import type { AggregationResult, PopulationItem } from '../aggregation.ts';
import { aggregateItems } from '../aggregation.ts';
import type { SignalResult } from '../signal.ts';
import { L_CONTACT, L_ORG_PROP, L_POLICY } from '../lists.ts';
import type { CrawlPage, EntityEvidence, ReviewRecord, SoughtTarget } from '../../schema/evidence.ts';

type Organization = EntityEvidence['organization'];
type EntityAbout = EntityEvidence['about'];
type EntityIdentity = EntityEvidence['identity'];
type EntityContact = EntityEvidence['contact'];
type EntityPolicies = EntityEvidence['policies'];
type EntityCredentials = EntityEvidence['credentials'];

/* ------------------------------------------------------------- helpers --- */

/** RFC 6901 JSON Pointer from path segments (D-2). Escapes `~` and `/` per the spec. */
function ptr(...segments: (string | number)[]): string {
  return '/' + segments.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

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
    default: return zero; // not_detected
  }
}

/** A present-and-non-empty string. */
function nonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/** A present-and-non-empty object (≥1 own key). */
function nonEmptyObject(v: unknown): boolean {
  return v != null && typeof v === 'object' && Object.keys(v as object).length > 0;
}

/* --------------------------------------------------------------- ENT-01 --- */

/**
 * schema.org Organization-family `@type` tokens recognised by ENT-01. Transcribed
 * verbatim from the rubric's ENT-01 wording — "an `Organization` node (or subtype,
 * e.g. `OnlineStore`, `LocalBusiness`)" — i.e. exactly the tokens it names. The rubric
 * gives an open-ended "e.g." and no closed list; adding further subtypes would be
 * inventing rubric data (a §18 version bump), so the recognised set is confined to the
 * named tokens. A site declaring an un-named Organization subtype would read as
 * `not_detected` here — a limitation flagged in the report.
 */
const ORGANIZATION_SCHEMA_TYPES: ReadonlySet<string> = new Set(['Organization', 'OnlineStore', 'LocalBusiness']);

/** The index of the first sampled page carrying a parseable Organization-family block, or -1. */
function organizationNodePageIndex(pages: readonly CrawlPage[]): number {
  return pages.findIndex((p) => p.structured_data.some((b) => b.parse_ok === true && b.types.some((t) => ORGANIZATION_SCHEMA_TYPES.has(t))));
}

/**
 * ENT-01 — Organization structured data present (§11). Single item — the site.
 * Satisfies when an `Organization` node (or a rubric-named subtype) is present and
 * parses on at least one sampled page. No violation; zero state `not_detected`. States:
 * `pass` · `not_detected` (no `partial`, no `not_evaluated`).
 */
export function ent01(pages: readonly CrawlPage[]): SignalResult {
  const idx = organizationNodePageIndex(pages);
  if (idx >= 0) {
    return single('pass', [ptr('crawl', 'pages', idx, 'structured_data')], 'an Organization node is present and parses on a sampled page');
  }
  return single('not_detected', [ptr('crawl', 'pages')], 'no parseable Organization node was detected in the pages reviewed');
}

/* --------------------------------------------------------------- ENT-02 --- */

/**
 * ENT-02 — Organization schema completeness (§11). Population: `L-ORG-PROP` (6 members),
 * read from the resolved Organization node. A member satisfies when present and
 * non-empty. `not_evaluated` when ENT-01 is `not_detected` (no Organization node), or
 * when the node was detected in markup but not resolved into `entity.organization`.
 *
 * **Violation — `name` absent (scoped).** The rubric declares both "Violation: name
 * absent" (→ `fail`) and a reachable `not_detected` zero state (§4/§21). An unscoped
 * name-absent violation would make `not_detected` unreachable (S == 0 always coincides
 * with name absent → `fail` would always win). The forced reconciliation, and the only
 * one under which every declared state is reachable, scopes the violation to a
 * *populated* node: a node carrying at least one other property but missing `name` is a
 * `fail`; a node with no readable properties at all is `not_detected`. States: `pass` ·
 * `partial` · `fail` · `not_detected` · `not_evaluated`.
 */
export function ent02(pages: readonly CrawlPage[], organization: Organization): SignalResult {
  if (organizationNodePageIndex(pages) < 0) {
    return notEvaluated('ENT-01 is not_detected (no Organization node); schema completeness was not evaluated');
  }
  if (organization == null) {
    return notEvaluated('an Organization node was detected in markup but no resolved Organization properties were collected');
  }

  const org = organization as Record<string, unknown>;
  const present = (member: (typeof L_ORG_PROP)[number]): boolean =>
    member === 'contact_point' || member === 'address' ? nonEmptyObject(org[member]) : nonEmptyString(org[member]);

  const items: PopulationItem[] = L_ORG_PROP.map((member) => ({ applicable: true, evaluable: true, satisfying: present(member) }));
  const satisfyingCount = items.filter((i) => i.satisfying).length;
  const nameAbsent = !present('name');
  const populationViolation = nameAbsent && satisfyingCount >= 1; // populated node missing its name

  const agg = aggregateItems(items, { zeroState: 'not_detected', populationViolation });
  const refs = [ptr('entity', 'evidence', 'organization')];
  return scored(
    agg,
    refs,
    reasonFor(
      agg,
      'L-ORG-PROP properties are present and non-empty',
      'every L-ORG-PROP property is present and non-empty',
      'the Organization node carries no readable L-ORG-PROP property',
      'the Organization node is populated but its name is absent',
    ),
  );
}

/* --------------------------------------------------------------- ENT-03 --- */

/**
 * ENT-03 — About page present (§11). Single item — the site. Satisfies when an About /
 * Our Story page is discoverable in the sample (`entity.about.present`). Sought-gated:
 * `not_evaluated` if `about` is absent from `crawl.sought[]` (§4.4). States: `pass` ·
 * `not_detected` · `not_evaluated` — no `partial`.
 */
export function ent03(about: EntityAbout, sought: readonly SoughtTarget[]): SignalResult {
  if (!sought.includes('about')) return notEvaluated('about was not among crawl.sought[]; an About page was not assessed');
  const refs = [ptr('entity', 'evidence', 'about', 'present')];
  return about.present
    ? single('pass', refs, 'an About / Our Story page is discoverable in the sample')
    : single('not_detected', refs, 'no About page was detected in the pages reviewed');
}

/* --------------------------------------------------------------- ENT-04 --- */

/**
 * ENT-04 — Business identity clarity (§11). **Type B — reviewer-assessed.** Population:
 * three declared components — `what_sold_stated`, `location_stated`, `trading_name_stated`.
 * A component satisfies when the reviewer records it stated explicitly in extractable
 * text. With no reviewer record for ENT-04 the signal is `not_evaluated` (rubric §2).
 * No violation, no `not_applicable`; zero state `not_detected`.
 */
export function ent04(identity: EntityIdentity, review: ReviewRecord | undefined): SignalResult {
  if (review === undefined) return notEvaluated('ENT-04 has no reviewer record; a Type B signal is not_evaluated without one');

  const components: [keyof EntityIdentity, boolean][] = [
    ['what_sold_stated', identity.what_sold_stated],
    ['location_stated', identity.location_stated],
    ['trading_name_stated', identity.trading_name_stated],
  ];
  const items: PopulationItem[] = components.map(([, stated]) => ({ applicable: true, evaluable: true, satisfying: stated === true }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('review', 'ENT-04'), ptr('entity', 'evidence', 'identity')];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'identity components are stated in text', 'what-is-sold, location and trading name are all stated in text', 'no identity component is stated in text'),
  );
}

/* --------------------------------------------------------------- ENT-05 --- */

/**
 * ENT-05 — Contact information completeness (§11). Population: `L-CONTACT` (3 members).
 * A channel satisfies when present as extractable text. Sought-gated: `not_evaluated`
 * if `contact` is absent from `crawl.sought[]` (§4.4). A contact form alone satisfies no
 * `L-CONTACT` member and is not read here (it is informational, §11). No violation; zero
 * state `not_detected`.
 */
export function ent05(contact: EntityContact, sought: readonly SoughtTarget[]): SignalResult {
  if (!sought.includes('contact')) return notEvaluated('contact was not among crawl.sought[]; contact completeness was not assessed');

  const value: Record<(typeof L_CONTACT)[number], unknown> = {
    email: contact.email,
    phone: contact.phone,
    postal_address: contact.postal_address,
  };
  const items: PopulationItem[] = L_CONTACT.map((member) => ({ applicable: true, evaluable: true, satisfying: nonEmptyString(value[member]) }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = L_CONTACT.map((member) => ptr('entity', 'evidence', 'contact', member));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-CONTACT channels are present as extractable text', 'every L-CONTACT channel is present as extractable text', 'no L-CONTACT channel is present as extractable text'),
  );
}

/* --------------------------------------------------------------- ENT-06 --- */

type EntityConsistency = EntityEvidence['consistency'];

/**
 * Normalise a value for ENT-06's identity comparison, exactly as the signal's
 * locked "item satisfies when" specifies (rubric §11). The identical transform is
 * applied to every component, in this order:
 *
 *   1. case        → `toLowerCase` (locale-independent; the scoring path takes no
 *                    locale input, engineering-rules §3).
 *   2. punctuation → every Unicode punctuation character (`\p{P}`) is replaced with a
 *                    single space — a *separator*, not deleted. ONLY punctuation: a
 *                    symbol such as '+' (`\p{S}`) is left in place, because the rubric
 *                    says "punctuation" and widening it to symbols would invent a rule.
 *   3. whitespace  → runs collapse to one space.
 *   4. trim        → leading/trailing whitespace removed.
 *
 * Punctuation is turned into a space, not removed: "Acme-Co" normalises to "acme co",
 * so "Sacred-Weaves" and "Sacred Weaves" compare equal. A value that is empty
 * afterwards carries nothing to compare and is dropped by {@link identityOccurrences}.
 */
function normaliseIdentity(value: string): string {
  return value.toLowerCase().replace(/\p{P}/gu, ' ').replace(/\s+/gu, ' ').trim();
}

/**
 * The comparable occurrences a component's declared sources contribute. Per the
 * ruling, an occurrence is a value FROM a declared source, not a distinct entry in a
 * deduplicated variant list: each element is one occurrence and the list is not
 * pre-deduplicated, so two identical raw entries are two agreeing occurrences (a
 * consistent component), not one lone value with nothing to compare. A value that
 * normalises to empty is an absent source, not an occurrence.
 */
function identityOccurrences(rawValues: readonly (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of rawValues) {
    if (raw == null) continue;
    const normalised = normaliseIdentity(raw);
    if (normalised.length > 0) out.push(normalised);
  }
  return out;
}

/**
 * One ENT-06 component as a §6.1 population item. Evaluable only with ≥2 comparable
 * occurrences (fewer means nothing to compare → the component drops out of E);
 * satisfies when those occurrences reduce to exactly one normalised variant.
 */
function consistencyComponent(occurrences: readonly string[]): PopulationItem {
  const evaluable = occurrences.length >= 2;
  return { applicable: true, evaluable, satisfying: evaluable && new Set(occurrences).size === 1 };
}

/**
 * ENT-06 — Identity consistency across the site (§11). Population: four declared
 * components — brand name, postal address, phone, logo alt text — aggregated through
 * the §6.2 primitive with no violation and zero state `fail`. A component satisfies
 * when its comparable occurrences reduce to exactly one normalised variant; a
 * component with fewer than two comparable occurrences is not evaluable, so a signal
 * in which no component is evaluable is `not_evaluated`. States: `pass` · `partial` ·
 * `fail` · `not_evaluated`.
 *
 * Sources per the locked ruling:
 *   - name:     `consistency.name_variants[]` + `Organization.name`. `crawl.pages[].title`
 *               is provenance/context only and is deliberately NOT read for a name.
 *   - address:  `consistency.address_variants[]`.
 *   - phone:    `consistency.phone_variants[]`.
 *   - logo alt: `entity.logo_alt` compared against the normalised `Organization.name`.
 *
 * **On-site consistency only** — no directory or third-party source is consulted, and
 * consistency across the wider web must never be claimed.
 */
export function ent06(
  consistency: EntityConsistency,
  logoAlt: string | null,
  organization: Organization,
): SignalResult {
  const orgName: string | null = organization?.name ?? null;

  const items: PopulationItem[] = [
    consistencyComponent(identityOccurrences([...consistency.name_variants, orgName])),
    consistencyComponent(identityOccurrences(consistency.address_variants)),
    consistencyComponent(identityOccurrences(consistency.phone_variants)),
    consistencyComponent(identityOccurrences([logoAlt, orgName])),
  ];

  const agg = aggregateItems(items, { zeroState: 'fail' });
  if (agg.state === 'not_evaluated') {
    return notEvaluated('no identity component has two comparable occurrences; on-site consistency was not assessed');
  }

  const refs = [
    ptr('entity', 'evidence', 'consistency', 'name_variants'),
    ptr('entity', 'evidence', 'consistency', 'address_variants'),
    ptr('entity', 'evidence', 'consistency', 'phone_variants'),
    ptr('entity', 'evidence', 'logo_alt'),
    ...(organization != null ? [ptr('entity', 'evidence', 'organization', 'name')] : []),
  ];
  return scored(
    agg,
    refs,
    reasonFor(
      agg,
      'evaluable identity components are internally consistent',
      'brand name, address, phone and logo alt text are each internally consistent across their sources',
      'no evaluable identity component is internally consistent',
      'no evaluable identity component is internally consistent',
    ),
  );
}

/* --------------------------------------------------------------- ENT-07 --- */

/**
 * ENT-07 — External entity references (`sameAs`) (§11). Single item — the site's
 * `sameAs` declaration. Satisfies when at least one external profile URL is declared in
 * `Organization.sameAs` (`entity.same_as`). `partial` when social links appear in markup
 * but are not declared in `sameAs`. Zero state `not_detected`. States: `pass` ·
 * `partial` · `not_detected`.
 *
 * The `partial` here is a signal-local classification of a single item, structurally the
 * same as TEC-03's: declared → `pass`, only-in-markup → `partial`, neither →
 * `not_detected`. §6.5 now documents this signal-local `partial` alongside TEC-03 and
 * TEC-13; ENT-07's three states and their conditions are fully specified here.
 */
export function ent07(sameAs: readonly string[], socialLinksInMarkup: readonly string[] | undefined): SignalResult {
  const refs = [ptr('entity', 'evidence', 'same_as'), ptr('entity', 'evidence', 'social_links_in_markup')];
  if (sameAs.length >= 1) {
    return single('pass', refs, 'at least one external profile URL is declared in Organization.sameAs');
  }
  if ((socialLinksInMarkup ?? []).length >= 1) {
    return single('partial', refs, 'social links appear in markup but are not declared in Organization.sameAs');
  }
  return single('not_detected', refs, 'no external entity references were detected in the pages reviewed');
}

/* --------------------------------------------------------------- ENT-09 --- */

/**
 * ENT-09 — Trust and policy pages (§11). Population: `L-POLICY` (5 members). A policy
 * satisfies when a distinct discoverable page exists for that type. Sought-gated:
 * `not_evaluated` if `policy` is absent from `crawl.sought[]` (§4.4). No violation; zero
 * state `not_detected`.
 */
export function ent09(policies: EntityPolicies, sought: readonly SoughtTarget[]): SignalResult {
  if (!sought.includes('policy')) return notEvaluated('policy was not among crawl.sought[]; trust and policy pages were not assessed');

  const pol = policies as Record<(typeof L_POLICY)[number], boolean>;
  const items: PopulationItem[] = L_POLICY.map((member) => ({ applicable: true, evaluable: true, satisfying: pol[member] === true }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = L_POLICY.map((member) => ptr('entity', 'evidence', 'policies', member));
  return scored(
    agg,
    refs,
    reasonFor(agg, 'L-POLICY pages are discoverable', 'every L-POLICY page is discoverable', 'no L-POLICY page was detected in the pages reviewed'),
  );
}

/* --------------------------------------------------------------- ENT-10 --- */

/**
 * ENT-10 — Credential and certification claims (§11). **Type B — reviewer-assessed.**
 * Population: credential claims found on sampled pages (`entity.credentials[]`). A claim
 * satisfies when the reviewer records it present in extractable text — i.e. not
 * image-only (`image_only === false`). With no reviewer record the signal is
 * `not_evaluated` (rubric §2). `not_applicable` when the reviewer records that no
 * credential is claimed anywhere (§14.2). No violation; zero state `not_detected`. The
 * signal records that a claim is made; it never verifies it.
 */
export function ent10(credentials: EntityCredentials, review: ReviewRecord | undefined): SignalResult {
  if (review === undefined) return notEvaluated('ENT-10 has no reviewer record; a Type B signal is not_evaluated without one');
  if (credentials.length === 0) {
    return notApplicable([ptr('review', 'ENT-10'), ptr('entity', 'evidence', 'credentials')], 'the reviewer records no credential claimed anywhere');
  }

  const items: PopulationItem[] = credentials.map((c) => ({ applicable: true, evaluable: true, satisfying: c.image_only === false }));
  const agg = aggregateItems(items, { zeroState: 'not_detected' });
  const refs = [ptr('review', 'ENT-10'), ptr('entity', 'evidence', 'credentials')];
  return scored(
    agg,
    refs,
    reasonFor(agg, 'credential claims are stated in extractable text', 'every credential claim is stated in extractable text', 'no credential claim is stated in extractable text (image-only)'),
  );
}
