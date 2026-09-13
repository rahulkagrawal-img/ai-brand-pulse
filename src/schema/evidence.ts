/**
 * Evidence record schema — the single source of truth.
 *
 * TypeScript types are INFERRED from these schemas (`z.infer`), never hand-written
 * alongside them, so validation rules and types cannot drift
 * (`engineering-rules.md` §9, O-3).
 *
 * Structure follows `audit-spec.md` §4–§7. Field requiredness follows `audit-spec.md` §3:
 *
 *   - a REQUIRED but NULLABLE field must be present; `null` means "known to be absent"
 *   - an OPTIONAL field may be missing entirely, which means "not collected"
 *
 * Those are different statements and the schema keeps them different, because the
 * `not_detected` / `not_evaluated` distinction (rubric §4.1–4.2) depends on it.
 * `.nullish()` is deliberately never used.
 *
 * Objects are `.strict()`: an undocumented key is an error, not a passthrough
 * (`audit-spec.md` §3). This is what makes evidence drift fail loudly instead of
 * silently scoring as absence.
 */

import { z } from 'zod';
import { L_ATTR_STRUCT, L_COMMERCIAL, L_FACT, L_INTENT, L_POLICY, L_RAWHTML, L_RELATION } from '../rubric/lists.ts';

const iso8601 = z.string().min(1);

/* ---------------------------------------------------------------- enums --- */

/** `audit-spec.md` §6.5. */
export const PageTypeSchema = z.enum([
  'home', 'collection', 'product', 'about', 'contact',
  'policy', 'editorial', 'faq', 'search', 'cart', 'account', 'other',
]);
export type PageType = z.infer<typeof PageTypeSchema>;

/**
 * Targets a collection may attempt (`audit-spec.md` §6.1): the `page_type` enum
 * plus `robots_txt` and `sitemap`. A target absent from `sought` yields
 * `not_evaluated`, never `not_detected` (rubric §4.4).
 */
export const SoughtTargetSchema = z.enum([
  ...PageTypeSchema.options, 'robots_txt', 'sitemap',
]);
export type SoughtTarget = z.infer<typeof SoughtTargetSchema>;

/** Commercial page types — the population for several signals (rubric §9 TEC-02, TEC-05). */
export const COMMERCIAL_PAGE_TYPES: readonly PageType[] = [
  'home', 'collection', 'product', 'about', 'contact', 'policy', 'editorial',
];

/* ------------------------------------------------------------- metadata --- */

export const MetadataSchema = z.object({
  audit_id: z.string().min(1),
  schema_version: z.string().min(1),
  rubric_version: z.string().min(1),
  engine_version: z.string().min(1),
  created_at: iso8601,
  /** Anchor for every time-relative computation. Never the system clock (rubric §5.4). */
  as_of: iso8601,
  mode: z.enum(['concierge', 'automated']),
  operator: z.string().min(1).optional(),
  audit_type: z.enum(['free_audit', 'blueprint']),
  locale: z.string().min(1),
  source_documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).strict().refine(
  (m) => m.mode !== 'concierge' || typeof m.operator === 'string',
  { message: 'metadata.operator is required when mode is "concierge"', path: ['operator'] },
);

/* ----------------------------------------------------------------- site --- */

export const SiteSchema = z.object({
  input_url: z.string().min(1),
  normalised_origin: z.string().min(1),
  brand_name: z.string().nullable().optional(),
  brand_name_source: z.enum(['operator', 'organization_schema', 'title', 'not_detected']),
  segment: z.enum(['d2c', 'heritage', 'export', 'other', 'not_stated']).optional(),
  /** Human-supplied. The ONLY input permitted to influence AID-08's state (rubric §9 AID-08). */
  stated_objectives: z.array(z.string()).optional(),
  platform_hint: z.string().nullable().optional(),
  key_paths: z.array(z.string()),
}).strict();

/* --------------------------------------------------------------- review --- */

/**
 * `audit-spec.md` §5b. Keyed by signal ID. A Type B signal with no entry here is
 * `not_evaluated` — never inferred, never defaulted to zero (rubric §2).
 */
export const ReviewRecordSchema = z.object({
  reviewer: z.string().min(1),
  reviewed_at: iso8601,
  method: z.string().min(1),
  reason: z.string().min(1),
}).strict();

export const ReviewSchema = z.record(z.string().regex(/^[A-Z]{3}-\d{2}$/), ReviewRecordSchema);

/* ---------------------------------------------------------------- crawl --- */

export const CrawlSampleSchema = z.object({
  collected_at: iso8601,
  method: z.enum(['manual', 'assisted', 'automated']),
  page_count: z.number().int().nonnegative(),
  max_depth: z.number().int().nonnegative(),
  selection_method: z.string(),
  render_mode: z.enum(['raw_html', 'rendered', 'both']),
  truncated: z.boolean(),
  /** What the collection actually attempted. Gates `not_detected` (rubric §4.4). */
  sought: z.array(SoughtTargetSchema),
}).strict();

export const CrawlOriginSchema = z.object({
  scheme: z.enum(['http', 'https']),
  redirect_chain: z.array(z.object({
    from: z.string(), to: z.string(), status: z.number().int(),
  }).strict()),
  hsts: z.boolean().nullable().optional(),
  tls_errors: z.array(z.string()),
  host_variants: z.record(z.string(), z.number().int()).optional(),
}).strict();

export const RobotsRuleSchema = z.object({
  user_agent: z.string(),
  directive: z.enum(['allow', 'disallow']),
  path: z.string(),
}).strict();

export const RobotsTxtSchema = z.object({
  fetched: z.boolean(),
  status_code: z.number().int().nullable(),
  body: z.string().nullable(),
  rules: z.array(RobotsRuleSchema),
  sitemap_directives: z.array(z.string()),
  agent_rules: z.record(z.string(), z.enum(['allow', 'disallow', 'not_specified'])),
}).strict();

export const SitemapSchema = z.object({
  url: z.string(),
  discovered_via: z.enum(['robots_txt', 'conventional_path', 'operator']),
  fetched: z.boolean(),
  status_code: z.number().int().nullable(),
  well_formed: z.boolean(),
  url_count: z.number().int().nullable(),
  urls: z.array(z.string()).optional(),
  truncated: z.boolean().optional(),
}).strict();

export const HeadingSchema = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string(),
  order: z.number().int().nonnegative(),
}).strict();

export const StructuredDataBlockSchema = z.object({
  format: z.string(),
  types: z.array(z.string()),
  parse_ok: z.boolean(),
  raw: z.string().optional(),
}).strict();

/** L-RAWHTML presence flags, per page. Read by AID-07. */
export const RawHtmlContainsSchema = z.object(
  Object.fromEntries(L_RAWHTML.map((k) => [k, z.boolean()])) as {
    [K in (typeof L_RAWHTML)[number]]: z.ZodBoolean
  },
).strict();

export const CrawlPageSchema = z.object({
  url: z.string(),
  final_url: z.string(),
  status_code: z.number().int(),
  /** Derived, human-correctable (`audit-spec.md` §6.5). Changes which signals apply. */
  page_type: PageTypeSchema,
  depth_from_home: z.number().int().nullable(),
  title: z.string().nullable(),
  meta_description: z.string().nullable(),
  meta_robots: z.string().nullable(),
  x_robots_tag: z.string().nullable(),
  canonical_url: z.string().nullable(),
  canonical_count: z.number().int().nonnegative(),
  viewport_meta: z.string().nullable(),
  headings: z.array(HeadingSchema),
  internal_links: z.array(z.string()),
  external_links: z.array(z.string()),
  structured_data: z.array(StructuredDataBlockSchema),
  html_bytes: z.number().int().nullable().optional(),
  raw_html_text_length: z.number().int().nullable().optional(),
  rendered_text_length: z.number().int().nullable().optional(),
  body_text_hash: z.string().nullable().optional(),
  raw_html_contains: RawHtmlContainsSchema.optional(),
}).strict();

export const CrawlSchema = z.object({
  sample: CrawlSampleSchema,
  origin: CrawlOriginSchema,
  robots_txt: RobotsTxtSchema,
  sitemaps: z.array(SitemapSchema),
  pages: z.array(CrawlPageSchema),
}).strict();

/* ------------------------------------------------- dimension: technical --- */

/** Technical signals read `crawl` directly; this block exists but carries no fields. */
export const TechnicalEvidenceSchema = z.object({}).strict();

/* --------------------------------------------------- dimension: content --- */

export const CollectionEvidenceSchema = z.object({
  url: z.string(),
  /** CON-02: a text block outside the product-listing container. */
  body_text_present: z.boolean().optional(),
  /** CON-01: linked from the primary navigation landmark. */
  in_primary_navigation: z.boolean().optional(),
  /** Informational (CON-06). */
  word_count: z.number().int().nonnegative().optional(),
  /** Superseded by `body_text_present`; retained as collected. */
  has_intro_text: z.boolean().optional(),
}).strict();

export const ContentProductEvidenceSchema = z.object({
  url: z.string(),
  /** CON-03: a non-empty text block in the product description region. */
  description_text_present: z.boolean().optional(),
  /** CON-11: count of inbound links from editorial content. */
  inbound_editorial_links: z.number().int().nonnegative().optional(),
  /** Informational (CON-06). */
  description_word_count: z.number().int().nonnegative().optional(),
  /** CON-04 (Type B) — reviewer-populated. Members of L-ATTR-TEXT. */
  attributes_in_text: z.array(z.string()).optional(),
}).strict();

export const EditorialArticleSchema = z.object({
  url: z.string(),
  published_at: iso8601.nullable().optional(),
  modified_at: iso8601.nullable().optional(),
  internal_links: z.array(z.string()).optional(),
}).strict();

export const EditorialEvidenceSchema = z.object({
  hub_present: z.boolean(),
  hub_url: z.string().nullable(),
  /** Informational (CON-06). */
  article_count: z.number().int().nonnegative().optional(),
  articles: z.array(EditorialArticleSchema).optional(),
}).strict();

/** CON-07 (Type B) — reviewer-populated. */
export const IntentCoverageSchema = z.object({
  intent: z.enum(L_INTENT),
  pages: z.array(z.string()),
}).strict();

export const DuplicationEvidenceSchema = z.object({
  exact_duplicate_groups: z.array(z.array(z.string())),
  empty_body_pages: z.array(z.string()),
  /** CON-12: paginated/filtered variants, excluded from duplicate grouping. */
  templated_page_urls: z.array(z.string()).optional(),
}).strict();

/** CON-08 / CON-09 are deferred (rubric §17); retained as collected, read by nothing. */
export const TopicEvidenceSchema = z.object({
  topic: z.string(),
  page_count: z.number().int().nonnegative(),
}).strict();

export const ContentEvidenceSchema = z.object({
  collections: z.array(CollectionEvidenceSchema),
  products: z.array(ContentProductEvidenceSchema),
  editorial: EditorialEvidenceSchema,
  intent_coverage: z.array(IntentCoverageSchema),
  topics: z.array(TopicEvidenceSchema).optional(),
  duplication: DuplicationEvidenceSchema,
}).strict();

/* ---------------------------------------------------- dimension: entity --- */

export const PostalAddressSchema = z.object({
  street_address: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
}).strict();

/** ENT-02 reads these against L-ORG-PROP. `same_as` is present but scored only by ENT-07. */
export const OrganizationSchema = z.object({
  name: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  contact_point: z.record(z.string(), z.unknown()).nullable().optional(),
  address: PostalAddressSchema.nullable().optional(),
  same_as: z.array(z.string()).optional(),
}).strict();

export const EntityEvidenceSchema = z.object({
  organization: OrganizationSchema.nullable(),
  about: z.object({
    url: z.string().nullable(),
    present: z.boolean(),
    /** Informational — the scored component of ENT-03 is presence only (rubric §11). */
    word_count: z.number().int().nonnegative().optional(),
  }).strict(),
  /** ENT-04 (Type B) — reviewer-populated. */
  identity: z.object({
    what_sold_stated: z.boolean(),
    location_stated: z.boolean(),
    trading_name_stated: z.boolean(),
  }).strict(),
  contact: z.object({
    page_present: z.boolean(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    postal_address: z.string().nullable(),
    contact_form: z.boolean(),
  }).strict(),
  consistency: z.object({
    name_variants: z.array(z.string()),
    address_variants: z.array(z.string()),
    phone_variants: z.array(z.string()),
  }).strict(),
  /** ENT-07: URLs declared in `Organization.sameAs`. */
  same_as: z.array(z.string()),
  /** ENT-07: social links present in markup but possibly not declared in sameAs. */
  social_links_in_markup: z.array(z.string()).optional(),
  /** ENT-08 is informational (rubric §11). */
  authorship: z.object({
    articles_with_author: z.number().int().nonnegative(),
    author_entities: z.array(z.object({
      name: z.string(),
      has_author_page: z.boolean().optional(),
      has_person_schema: z.boolean().optional(),
    }).strict()),
  }).strict().optional(),
  /** ENT-09, against L-POLICY. */
  policies: z.object(
    Object.fromEntries(L_POLICY.map((k) => [k, z.boolean()])) as {
      [K in (typeof L_POLICY)[number]]: z.ZodBoolean
    },
  ).strict(),
  /** ENT-10 (Type B) — reviewer-populated. */
  credentials: z.array(z.object({
    claim_text: z.string(),
    source_url: z.string(),
    image_only: z.boolean(),
    independently_verified: z.literal(false),
  }).strict()),
  logo_alt: z.string().nullable(),
}).strict();

/* --------------------------------------------------- dimension: product --- */

export const OfferSchema = z.object({
  price: z.number().nullable(),
  price_currency: z.string().nullable(),
  availability: z.string().nullable(),
}).strict();

export const ProductPageEvidenceSchema = z.object({
  url: z.string(),
  /** PRD-01. */
  structured_data_present: z.boolean(),
  parse_ok: z.boolean(),
  name_present: z.boolean().optional(),
  required_property_errors: z.array(z.string()).optional(),
  /** PRD-03 / PRD-04 / PRD-05. */
  offer: OfferSchema,
  /** PRD-03: read ONLY to phrase the finding; never alters the state (rubric §12). */
  price_visible_in_text: z.boolean().optional(),
  /** PRD-06. */
  sku: z.string().nullable(),
  gtin: z.string().nullable(),
  mpn: z.string().nullable(),
  product_id: z.string().nullable().optional(),
  /** PRD-07. */
  brand: z.string().nullable(),
  /** PRD-08. */
  variants: z.array(z.record(z.string(), z.unknown())),
  has_variant_selector: z.boolean(),
  /** PRD-09, against L-ATTR-STRUCT. */
  attributes: z.record(z.enum(L_ATTR_STRUCT), z.string()),
  /** PRD-10. */
  aggregate_rating: z.number().nullable(),
  review_count: z.number().int().nonnegative(),
  reviews_visible_on_page: z.boolean(),
  /** PRD-11 / PRD-12. */
  shipping_details: z.object({
    structured: z.boolean(),
    free_shipping_threshold: z.number().nullable().optional(),
  }).strict().nullable(),
  return_policy: z.object({
    structured: z.boolean(),
    return_window_days: z.number().int().nullable().optional(),
  }).strict().nullable(),
  /** PRD-13 / PRD-14 are informational (rubric §12). */
  breadcrumb_list: z.boolean().optional(),
  category: z.string().nullable().optional(),
  image_urls: z.array(z.string()).optional(),
  images_with_alt: z.number().int().nonnegative().optional(),
  image_in_structured_data: z.boolean().optional(),
}).strict();

export const ProductEvidenceSchema = z.object({
  pages: z.array(ProductPageEvidenceSchema),
}).strict();

/* ------------------------------------------ dimension: ai_discoverability --- */

export const AiEvidenceSchema = z.object({
  /** AID-01 (Type B) — reviewer-populated. */
  answerability: z.object({
    pages_with_lead_answer: z.number().int().nonnegative(),
    question_headings: z.array(z.string()),
  }).strict(),
  /** AID-02 (Type B) — reviewer-populated. Members of L-FACT. */
  facts: z.object({
    facts_in_text: z.array(z.enum(L_FACT)),
    facts_image_only: z.array(z.enum(L_FACT)),
  }).strict(),
  /** AID-03. */
  faq: z.object({
    faq_pages: z.array(z.string()),
    faqpage_schema_present: z.boolean(),
  }).strict(),
  /** AID-04 is RETIRED (rubric §16); retained as collected, read by nothing. */
  entity_clarity: z.object({
    brand_statement_present: z.boolean(),
    category_statement_present: z.boolean(),
  }).strict().optional(),
  /** AID-05 is informational (rubric §13). */
  schema_types: z.array(z.string()).optional(),
  /** AID-06, against L-RELATION. */
  relationships: z.object(
    Object.fromEntries(L_RELATION.map((k) => [`${k}_present`, z.boolean()])) as {
      [K in `${(typeof L_RELATION)[number]}_present`]: z.ZodBoolean
    },
  ).strict(),
  /** AID-09, against L-COMMERCIAL. */
  commercial_facts: z.object(
    Object.fromEntries(L_COMMERCIAL.map((k) => [`${k}_in_text`, z.boolean()])) as {
      [K in `${(typeof L_COMMERCIAL)[number]}_in_text`]: z.ZodBoolean
    },
  ).strict(),
  /** AID-10 is DEFERRED (rubric §17); retained as collected, read by nothing. */
  extractability: z.object({
    semantic_html_ratio: z.number().nullable(),
    tabular_data_as_tables: z.boolean().nullable(),
    text_in_images_flag: z.boolean(),
  }).strict().optional(),
}).strict();

/* ----------------------------------------------------- evidence record --- */

export const EvidenceRecordSchema = z.object({
  metadata: MetadataSchema,
  site: SiteSchema,
  review: ReviewSchema,
  crawl: CrawlSchema,
  technical: z.object({ evidence: TechnicalEvidenceSchema }).strict(),
  content: z.object({ evidence: ContentEvidenceSchema }).strict(),
  entity: z.object({ evidence: EntityEvidenceSchema }).strict(),
  product: z.object({ evidence: ProductEvidenceSchema }).strict(),
  ai_discoverability: z.object({ evidence: AiEvidenceSchema }).strict(),
}).strict();

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
export type CrawlPage = z.infer<typeof CrawlPageSchema>;
export type RobotsTxt = z.infer<typeof RobotsTxtSchema>;
export type CrawlOrigin = z.infer<typeof CrawlOriginSchema>;
export type Sitemap = z.infer<typeof SitemapSchema>;
export type ProductPageEvidence = z.infer<typeof ProductPageEvidenceSchema>;
export type EntityEvidence = z.infer<typeof EntityEvidenceSchema>;
export type ContentEvidence = z.infer<typeof ContentEvidenceSchema>;
export type AiEvidence = z.infer<typeof AiEvidenceSchema>;
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;

/* -------------------------------------------------- fixture envelope --- */

/**
 * Fixture files carry a `fixture` block that is NOT part of the audit schema
 * (`fixtures/README.md`). It is stripped before the record reaches the engine,
 * and `EvidenceRecordSchema` rejects it — which is the intended behaviour for a
 * real audit record.
 */
export const FixtureMetaSchema = z.object({
  name: z.string(),
  synthetic: z.literal(true),
  not_a_real_website: z.literal(true),
  purpose: z.string(),
  expected_behaviour_notes: z.array(z.string()),
  rubric_version: z.string().optional(),
}).strict();

export const FixtureFileSchema = EvidenceRecordSchema.extend({
  fixture: FixtureMetaSchema,
}).strict();

export type FixtureFile = z.infer<typeof FixtureFileSchema>;
