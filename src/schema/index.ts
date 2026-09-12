/**
 * Evidence loading and validation.
 *
 * The engine never accepts an unvalidated record: a malformed structure must fail
 * loudly rather than be scored around (`audit-spec.md` §3).
 */

import { z } from 'zod';
import { EvidenceRecordSchema, FixtureFileSchema, type EvidenceRecord, type FixtureFile } from './evidence.ts';

export * from './evidence.ts';

export class EvidenceValidationError extends Error {
  readonly issues: readonly z.ZodIssue[];
  constructor(source: string, issues: readonly z.ZodIssue[]) {
    super(
      `Invalid evidence record (${source}):\n` +
        issues.map((i) => `  ${i.path.join('.') || '<root>'}: ${i.message}`).join('\n'),
    );
    this.name = 'EvidenceValidationError';
    this.issues = issues;
  }
}

/** Parse an audit evidence record. Throws `EvidenceValidationError` on any issue. */
export function parseEvidenceRecord(data: unknown, source = 'evidence'): EvidenceRecord {
  const result = EvidenceRecordSchema.safeParse(data);
  if (!result.success) throw new EvidenceValidationError(source, result.error.issues);
  return result.data;
}

/** Parse a fixture file (an evidence record plus its `fixture` block). */
export function parseFixtureFile(data: unknown, source = 'fixture'): FixtureFile {
  const result = FixtureFileSchema.safeParse(data);
  if (!result.success) throw new EvidenceValidationError(source, result.error.issues);
  return result.data;
}

/**
 * Strip the fixture-only `fixture` block, yielding a record the engine can consume.
 * The result is re-validated against `EvidenceRecordSchema`, which proves the fixture
 * body is a genuinely valid audit record and not merely a valid fixture.
 */
export function toEvidenceRecord(fixture: FixtureFile, source = 'fixture'): EvidenceRecord {
  const { fixture: _fixtureMeta, ...record } = fixture;
  return parseEvidenceRecord(record, source);
}

/** Non-throwing variant, for tooling that wants to report every failure at once. */
export function safeParseFixtureFile(
  data: unknown,
): { ok: true; value: FixtureFile } | { ok: false; issues: readonly z.ZodIssue[] } {
  const result = FixtureFileSchema.safeParse(data);
  return result.success ? { ok: true, value: result.data } : { ok: false, issues: result.error.issues };
}
