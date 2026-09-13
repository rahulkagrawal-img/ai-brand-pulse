/**
 * Signal derivation contract (Phase 3 planning, decisions D-1 and D-2).
 *
 * No signal is implemented yet; these tests pin the contract that Phase 3 signal
 * functions must satisfy — that a `SignalResult` is an `AggregationResult` (rubric
 * §6 state and counts) plus the derivation's own evidence refs and reason.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggregate } from './aggregation.ts';
import type { SignalResult } from './signal.ts';

describe('SignalResult contract (D-1)', () => {
  it('is an AggregationResult plus evidence refs and reason', () => {
    // A signal classifies its population, aggregates (§6), then attaches evidence.
    const aggregated = aggregate({
      applicable: 3,
      evaluable: 3,
      satisfying: 2,
      violation: false,
      zeroState: 'not_detected',
    });
    const result: SignalResult = {
      ...aggregated,
      // JSON Pointer refs (RFC 6901), D-2.
      evidenceRefs: ['/crawl/pages/0/headings', '/crawl/pages/1/headings'],
      reason: 'some but not all sampled pages satisfy the rule',
    };

    strictEqual(result.state, 'partial');
    strictEqual(result.itemsApplicable, 3);
    strictEqual(result.itemsEvaluated, 3);
    strictEqual(result.itemsSatisfying, 2);
    ok(result.evidenceRefs.every((ref) => ref.startsWith('/')));
    ok(result.reason.length > 0);
  });

  it('carries every AggregationResult field plus the two derivation fields', () => {
    const result: SignalResult = {
      state: 'not_evaluated',
      itemsApplicable: 0,
      itemsEvaluated: 0,
      itemsSatisfying: 0,
      // A not_evaluated signal may cite no evidence (audit-spec §7.2).
      evidenceRefs: [],
      reason: 'L-AIAGENT is empty; no agent list to evaluate against',
    };
    deepStrictEqual(Object.keys(result).sort(), [
      'evidenceRefs',
      'itemsApplicable',
      'itemsEvaluated',
      'itemsSatisfying',
      'reason',
      'state',
    ]);
    strictEqual(result.evidenceRefs.length, 0);
  });
});
