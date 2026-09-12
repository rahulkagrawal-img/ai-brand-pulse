/**
 * Declared lists — Scoring Rubric v1.0 §7.
 *
 * These lists ARE the standard against which declared-list signals are scored
 * (rubric §6.4). Changing any membership is a rubric version bump (§18), so they
 * are transcribed here verbatim and must not be edited without one.
 *
 * Ordering is fixed so that iteration is reproducible (rubric §5.4 item 3).
 */

export const RUBRIC_VERSION = '1.0.0' as const;

/** L-POLICY — trust policy page types. Used by ENT-09. */
export const L_POLICY = ['privacy', 'terms', 'returns', 'shipping', 'refunds'] as const;

/** L-INTENT — buyer intents. Used by CON-07 (Type B). */
export const L_INTENT = [
  'how_to_choose',
  'sizing_and_fit',
  'care_and_maintenance',
  'authenticity_and_provenance',
  'shipping_and_duties',
  'comparison',
] as const;

/** L-ATTR-TEXT — attributes expected in human-readable product text. Used by CON-04 (Type B). */
export const L_ATTR_TEXT = [
  'material',
  'dimensions',
  'technique_or_craft',
  'origin',
  'care',
] as const;

/** L-ATTR-STRUCT — attributes expected as structured properties. Used by PRD-09. */
export const L_ATTR_STRUCT = [
  'material',
  'colour',
  'size_or_dimensions',
  'weight',
  'pattern_or_technique',
  'origin',
] as const;

/** L-FACT — facts a machine should be able to extract. Used by AID-02 (Type B). */
export const L_FACT = [
  'what_sold',
  'materials',
  'origin',
  'price',
  'delivery_terms',
  'returns_terms',
  'care',
] as const;

/**
 * L-ORG-PROP — Organization properties. Used by ENT-02.
 *
 * The rubric names the schema.org property `contactPoint`; the audit record uses
 * snake_case throughout (`audit-spec.md` §3), so the record field is `contact_point`.
 * That is a naming convention, not a membership difference.
 *
 * `sameAs` is deliberately NOT a member — it is scored solely by ENT-07 (rubric §7).
 */
export const L_ORG_PROP = [
  'name',
  'url',
  'logo',
  'description',
  'contact_point',
  'address',
] as const;

/** L-CONTACT — contact channels. Used by ENT-05. */
export const L_CONTACT = ['email', 'phone', 'postal_address'] as const;

/** L-COMMERCIAL — commercial facts expected as text. Used by AID-09. */
export const L_COMMERCIAL = ['price', 'shipping', 'returns'] as const;

/** L-RELATION — semantic relationship mechanisms. Used by AID-06. */
export const L_RELATION = ['breadcrumbs', 'entity_links', 'about_mentions'] as const;

/** L-RAWHTML — content elements checked for presence in the raw HTML response. Used by AID-07. */
export const L_RAWHTML = ['h1_text', 'body_text', 'primary_commercial_fact'] as const;

export type PolicyType = (typeof L_POLICY)[number];
export type IntentType = (typeof L_INTENT)[number];
export type AttrTextType = (typeof L_ATTR_TEXT)[number];
export type AttrStructType = (typeof L_ATTR_STRUCT)[number];
export type FactType = (typeof L_FACT)[number];
export type OrgPropType = (typeof L_ORG_PROP)[number];
export type ContactType = (typeof L_CONTACT)[number];
export type CommercialFactType = (typeof L_COMMERCIAL)[number];
export type RelationType = (typeof L_RELATION)[number];
export type RawHtmlElement = (typeof L_RAWHTML)[number];

/**
 * L-AIAGENT is declared by rubric §7 as "a versioned list of named AI and assistant
 * crawler user-agent tokens, maintained as rubric data" — but the rubric does not
 * enumerate its members.
 *
 * AID-08 cannot be implemented until that membership is supplied. This is recorded
 * as an open blocker rather than populated here: inventing the membership would be
 * inventing rubric data, and adding or removing an agent is a version bump (§18).
 *
 * See the Milestone 1 Phase 1 report, blocker B-3.
 */
export const L_AIAGENT: readonly string[] = [];
