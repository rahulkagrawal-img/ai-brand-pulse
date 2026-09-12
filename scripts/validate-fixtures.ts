/**
 * Validates every file in `fixtures/` against the evidence schema.
 *
 * Run: npm run validate:fixtures
 * Exits non-zero if any fixture is invalid.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { safeParseFixtureFile, toEvidenceRecord } from '../src/schema/index.ts';

const FIXTURE_DIR = 'fixtures';

let failures = 0;

const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json')).sort();

if (files.length === 0) {
  console.error('No fixtures found.');
  process.exit(1);
}

for (const file of files) {
  const path = join(FIXTURE_DIR, file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`FAIL  ${path}\n  not valid JSON: ${(err as Error).message}`);
    failures += 1;
    continue;
  }

  const result = safeParseFixtureFile(parsed);
  if (!result.ok) {
    console.error(`FAIL  ${path}`);
    for (const issue of result.issues) {
      console.error(`        ${issue.path.join('.') || '<root>'}: ${issue.message}`);
    }
    failures += 1;
    continue;
  }

  try {
    toEvidenceRecord(result.value, path);
  } catch (err) {
    console.error(`FAIL  ${path}\n  ${(err as Error).message}`);
    failures += 1;
    continue;
  }

  console.log(`OK    ${path}`);
}

console.log(`\n${files.length - failures}/${files.length} fixtures valid.`);
process.exit(failures === 0 ? 0 : 1);
