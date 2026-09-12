/**
 * Phase 1 — evidence schema and fixture validation.
 *
 * These tests prove two things: that the shipped fixtures are valid records, and
 * that the schema REJECTS the specific malformations the rubric's honesty rules
 * depend on catching. A schema that only accepts good input is untested.
 */

import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  EvidenceRecordSchema,
  EvidenceValidationError,
  parseEvidenceRecord,
  parseFixtureFile,
  safeParseFixtureFile,
  toEvidenceRecord,
} from './index.ts';
import { L_ATTR_STRUCT, L_FACT, L_INTENT, L_POLICY, L_RAWHTML, RUBRIC_VERSION } from '../rubric/lists.ts';

const FIXTURE_DIR = 'fixtures';
const fixtureFiles = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json')).sort();

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

/** Deep clone so a mutation in one test cannot leak into another. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('fixture inventory', () => {
  it('finds the three documented fixtures', () => {
    deepStrictEqual(fixtureFiles, [
      'minimal-valid-site.json',
      'strong-site.json',
      'weak-site.json',
    ]);
  });
});

describe('shipped fixtures validate', () => {
  for (const name of fixtureFiles) {
    it(`${name} parses as a fixture file`, () => {
      const result = safeParseFixtureFile(readFixture(name));
      if (!result.ok) {
        throw new Error(
          `${name} invalid:\n` +
            result.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'),
        );
      }
    });

    it(`${name} body is a valid audit record once the fixture block is stripped`, () => {
      const fixture = parseFixtureFile(readFixture(name), name);
      const record = toEvidenceRecord(fixture, name);
      strictEqual(record.metadata.rubric_version, RUBRIC_VERSION);
      ok(!('fixture' in record));
    });

    it(`${name} declares itself synthetic`, () => {
      const fixture = parseFixtureFile(readFixture(name), name);
      strictEqual(fixture.fixture.synthetic, true);
      strictEqual(fixture.fixture.not_a_real_website, true);
    });

    it(`${name} agrees with itself about the rubric version`, () => {
      const fixture = parseFixtureFile(readFixture(name), name);
      strictEqual(fixture.fixture.rubric_version, fixture.metadata.rubric_version);
      strictEqual(fixture.metadata.rubric_version, RUBRIC_VERSION);
    });
  }
});

describe('the fixture block is not part of the audit schema', () => {
  it('a record still carrying `fixture` is rejected', () => {
    const raw = readFixture('strong-site.json');
    throws(() => parseEvidenceRecord(raw, 'strong'), EvidenceValidationError);
  });
});

describe('strict objects reject undocumented keys', () => {
  it('rejects an unknown top-level key', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture)) as Record<string, unknown>;
    record['unexpected_section'] = {};
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('rejects an unknown key inside a crawled page', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    (record.crawl.pages[0] as unknown as Record<string, unknown>)['invented_field'] = true;
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });
});

describe('declared-list vocabularies are enforced (rubric §7)', () => {
  it('rejects a buyer intent outside L-INTENT', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    record.content.evidence.intent_coverage.push({
      intent: 'invented_intent' as (typeof L_INTENT)[number],
      pages: [],
    });
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('rejects a product attribute key outside L-ATTR-STRUCT', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    const page = record.product.evidence.pages[0];
    ok(page);
    (page.attributes as Record<string, string>)['thread_count'] = '120';
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('rejects an extracted fact outside L-FACT', () => {
    const fixture = parseFixtureFile(readFixture('weak-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    record.ai_discoverability.evidence.facts.facts_image_only.push(
      'thread_count' as (typeof L_FACT)[number],
    );
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('requires every L-POLICY member to be present', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    delete (record.entity.evidence.policies as Record<string, unknown>)['refunds'];
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('accepts exactly the L-RAWHTML members and no others', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    const page = record.crawl.pages[0];
    ok(page?.raw_html_contains);
    deepStrictEqual(Object.keys(page.raw_html_contains).sort(), [...L_RAWHTML].sort());
    (page.raw_html_contains as Record<string, boolean>)['footer_text'] = true;
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('the declared lists match the locked rubric', () => {
    deepStrictEqual([...L_POLICY], ['privacy', 'terms', 'returns', 'shipping', 'refunds']);
    deepStrictEqual([...L_ATTR_STRUCT], [
      'material', 'colour', 'size_or_dimensions', 'weight', 'pattern_or_technique', 'origin',
    ]);
    deepStrictEqual([...L_RAWHTML], ['h1_text', 'body_text', 'primary_commercial_fact']);
  });
});

describe('null and missing are different statements (audit-spec §3)', () => {
  it('a nullable field accepts null — "known to be absent"', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    const page = record.product.evidence.pages[0];
    ok(page);
    page.offer.price = null;
    const reparsed = parseEvidenceRecord(record);
    strictEqual(reparsed.product.evidence.pages[0]?.offer.price, null);
  });

  it('a required nullable field cannot simply be missing', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    const page = record.product.evidence.pages[0];
    ok(page);
    delete (page.offer as Record<string, unknown>)['price'];
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('an optional field may be missing — "not collected" — and stays missing', () => {
    const fixture = parseFixtureFile(readFixture('minimal-valid-site.json'));
    const record = toEvidenceRecord(fixture);
    const page = record.crawl.pages[0];
    ok(page);
    // minimal-valid-site collects raw_html only, so AID-07's input was never collected.
    strictEqual(page.raw_html_contains, undefined);
    ok(!('raw_html_contains' in page));
  });
});

describe('crawl.sought gates not_detected (rubric §4.4)', () => {
  it('is present on every fixture', () => {
    for (const name of fixtureFiles) {
      const fixture = parseFixtureFile(readFixture(name), name);
      ok(Array.isArray(fixture.crawl.sample.sought), `${name} has crawl.sample.sought`);
    }
  });

  it('rejects a sought target outside the declared enum', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    (record.crawl.sample.sought as string[]).push('newsletter');
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('minimal-valid-site sought only the homepage', () => {
    const fixture = parseFixtureFile(readFixture('minimal-valid-site.json'));
    deepStrictEqual(fixture.crawl.sample.sought, ['home']);
  });
});

describe('review records (audit-spec §5b)', () => {
  it('minimal-valid-site has no reviewer records', () => {
    const fixture = parseFixtureFile(readFixture('minimal-valid-site.json'));
    deepStrictEqual(Object.keys(fixture.review), []);
  });

  it('strong and weak carry records for all six Type B signals', () => {
    for (const name of ['strong-site.json', 'weak-site.json']) {
      const fixture = parseFixtureFile(readFixture(name), name);
      deepStrictEqual(
        Object.keys(fixture.review).sort(),
        ['AID-01', 'AID-02', 'CON-04', 'CON-07', 'ENT-04', 'ENT-10'],
        name,
      );
    }
  });

  it('rejects a review key that is not a signal ID', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    (record.review as Record<string, unknown>)['not-a-signal'] = {
      reviewer: 'x', reviewed_at: '2026-09-12T00:00:00+00:00', method: 'y', reason: 'z',
    };
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('rejects a review record missing its reviewer', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    delete (record.review['CON-04'] as unknown as Record<string, unknown>)['reviewer'];
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });
});

describe('metadata invariants', () => {
  it('requires an operator in concierge mode', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    strictEqual(record.metadata.mode, 'concierge');
    delete (record.metadata as Record<string, unknown>)['operator'];
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });

  it('every fixture carries as_of, the anchor for time-relative rules', () => {
    for (const name of fixtureFiles) {
      const fixture = parseFixtureFile(readFixture(name), name);
      ok(fixture.metadata.as_of.length > 0, name);
    }
  });

  it('rejects an unknown audit mode', () => {
    const fixture = parseFixtureFile(readFixture('strong-site.json'));
    const record = clone(toEvidenceRecord(fixture));
    (record.metadata as Record<string, unknown>)['mode'] = 'autopilot';
    throws(() => parseEvidenceRecord(record), EvidenceValidationError);
  });
});

describe('parse is a pure function of its input', () => {
  it('parsing the same record twice yields deeply equal results', () => {
    const raw = readFixture('strong-site.json');
    const a = toEvidenceRecord(parseFixtureFile(clone(raw)));
    const b = toEvidenceRecord(parseFixtureFile(clone(raw)));
    deepStrictEqual(a, b);
  });

  it('does not mutate the input object', () => {
    const raw = readFixture('weak-site.json');
    const before = JSON.stringify(raw);
    parseFixtureFile(raw);
    strictEqual(JSON.stringify(raw), before);
  });
});

describe('EvidenceRecordSchema shape', () => {
  it('requires all five dimension evidence blocks', () => {
    for (const dim of ['technical', 'content', 'entity', 'product', 'ai_discoverability']) {
      const fixture = parseFixtureFile(readFixture('strong-site.json'));
      const record = clone(toEvidenceRecord(fixture)) as Record<string, unknown>;
      delete record[dim];
      throws(() => parseEvidenceRecord(record), EvidenceValidationError, `missing ${dim}`);
    }
  });

  it('exposes exactly the documented top-level sections', () => {
    deepStrictEqual(Object.keys(EvidenceRecordSchema.shape).sort(), [
      'ai_discoverability', 'content', 'crawl', 'entity',
      'metadata', 'product', 'review', 'site', 'technical',
    ]);
  });
});
