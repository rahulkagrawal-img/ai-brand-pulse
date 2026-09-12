/**
 * Global aggregation rule — tests. Rubric v1.0 §6; tests/README §3 Layer 0.
 *
 * A bug here is a bug in every multi-item signal at once, so this covers the full
 * step order of §6.2, violation precedence, both zero-state variants, partial
 * evaluability, the single-item (§6.5) and declared-list (§6.4) reductions, input
 * validation, and order independence / determinism.
 *
 * Expected states are derived by hand from §6.2, never by running the engine
 * (engineering-rules.md §6, tests/README §4).
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SIGNAL_STATES,
  aggregate,
  aggregateItems,
  type AggregationInput,
  type PopulationItem,
  type ZeroState,
} from './aggregation.ts';

/** Base input helper — override only the fields a case is about. */
function input(overrides: Partial<AggregationInput>): AggregationInput {
  return {
    applicable: 0,
    evaluable: 0,
    satisfying: 0,
    violation: false,
    zeroState: 'not_detected',
    ...overrides,
  };
}

describe('the state vocabulary is the closed set of six (rubric §4)', () => {
  it('has exactly the six states, in rubric order', () => {
    deepStrictEqual(SIGNAL_STATES, [
      'pass',
      'partial',
      'fail',
      'not_detected',
      'not_applicable',
      'not_evaluated',
    ]);
  });
});

describe('aggregate — §6.2 step order', () => {
  it('step 1: A == 0 → not_applicable', () => {
    strictEqual(aggregate(input({ applicable: 0 })).state, 'not_applicable');
  });

  it('step 2: A > 0, E == 0 → not_evaluated', () => {
    strictEqual(aggregate(input({ applicable: 4, evaluable: 0 })).state, 'not_evaluated');
  });

  it('step 4: S == E (all satisfy), no violation → pass', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 3 })).state,
      'pass',
    );
  });

  it('step 5: 0 < S < E → partial', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 1 })).state,
      'partial',
    );
  });

  it('step 6: S == 0 → the declared zero state (not_detected variant)', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 0, zeroState: 'not_detected' }))
        .state,
      'not_detected',
    );
  });

  it('step 6: S == 0 → the declared zero state (fail variant)', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 0, zeroState: 'fail' })).state,
      'fail',
    );
  });
});

describe('aggregate — violation precedence (§6.2 step 3, D-14)', () => {
  it('violation beats pass: violation with S == E → fail', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 3, violation: true })).state,
      'fail',
    );
  });

  it('violation beats partial: violation with 0 < S < E → fail', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 1, violation: true })).state,
      'fail',
    );
  });

  it('violation beats the zero state: violation with S == 0 → fail', () => {
    strictEqual(
      aggregate(input({ applicable: 3, evaluable: 3, satisfying: 0, violation: true })).state,
      'fail',
    );
  });

  it('a violation never overrides not_applicable (step 1 wins over step 3)', () => {
    strictEqual(aggregate(input({ applicable: 0, violation: true })).state, 'not_applicable');
  });

  it('a violation never resurrects an unevaluable signal (step 2 wins over step 3)', () => {
    strictEqual(
      aggregate(input({ applicable: 5, evaluable: 0, violation: true })).state,
      'not_evaluated',
    );
  });
});

describe('aggregate — partial evaluability (§6.3)', () => {
  it('scores over the evaluable items only, and records the shortfall in the counts', () => {
    // A = 5, E = 3, S = 3 → every *evaluable* item satisfies → pass, but only 3 of 5 were seen.
    const result = aggregate(input({ applicable: 5, evaluable: 3, satisfying: 3 }));
    strictEqual(result.state, 'pass');
    strictEqual(result.itemsApplicable, 5);
    strictEqual(result.itemsEvaluated, 3);
    strictEqual(result.itemsSatisfying, 3);
  });

  it('partial over evaluable items: A=5, E=3, S=1 → partial', () => {
    strictEqual(
      aggregate(input({ applicable: 5, evaluable: 3, satisfying: 1 })).state,
      'partial',
    );
  });

  it('no evaluable items despite applicable ones → not_evaluated', () => {
    const result = aggregate(input({ applicable: 5, evaluable: 0 }));
    strictEqual(result.state, 'not_evaluated');
    strictEqual(result.itemsApplicable, 5);
    strictEqual(result.itemsEvaluated, 0);
  });
});

describe('aggregate — single-item signals (§6.5) reduce with A = E = 1', () => {
  it('violation → fail', () => {
    strictEqual(
      aggregate(input({ applicable: 1, evaluable: 1, satisfying: 1, violation: true })).state,
      'fail',
    );
  });
  it('satisfies → pass', () => {
    strictEqual(aggregate(input({ applicable: 1, evaluable: 1, satisfying: 1 })).state, 'pass');
  });
  it('does not satisfy → zero state (not_detected)', () => {
    strictEqual(
      aggregate(input({ applicable: 1, evaluable: 1, satisfying: 0, zeroState: 'not_detected' }))
        .state,
      'not_detected',
    );
  });
  it('does not satisfy → zero state (fail)', () => {
    strictEqual(
      aggregate(input({ applicable: 1, evaluable: 1, satisfying: 0, zeroState: 'fail' })).state,
      'fail',
    );
  });
});

describe('aggregate — the result echoes the counts', () => {
  it('returns the counts it was given', () => {
    const result = aggregate(input({ applicable: 4, evaluable: 4, satisfying: 2 }));
    deepStrictEqual(result, {
      state: 'partial',
      itemsApplicable: 4,
      itemsEvaluated: 4,
      itemsSatisfying: 2,
    });
  });

  it('zeroState does not leak into a non-zero result', () => {
    // zeroState is 'fail' but S == E, so the state is pass, not fail.
    strictEqual(
      aggregate(input({ applicable: 2, evaluable: 2, satisfying: 2, zeroState: 'fail' })).state,
      'pass',
    );
  });
});

describe('aggregate — input validation fails loudly (A ⊇ E ⊇ S)', () => {
  it('rejects a negative count', () => {
    throws(() => aggregate(input({ applicable: -1 })), RangeError);
  });
  it('rejects a non-integer count', () => {
    throws(() => aggregate(input({ applicable: 2.5, evaluable: 1 })), RangeError);
  });
  it('rejects evaluable > applicable', () => {
    throws(() => aggregate(input({ applicable: 2, evaluable: 3 })), RangeError);
  });
  it('rejects satisfying > evaluable', () => {
    throws(
      () => aggregate(input({ applicable: 3, evaluable: 2, satisfying: 3 })),
      RangeError,
    );
  });
});

// ---------------------------------------------------------------------------
// aggregateItems — the item-classifying adapter (§6.1, §6.3–6.5)
// ---------------------------------------------------------------------------

/** Convenience builders keep the population tables readable. */
const item = (o: Partial<PopulationItem> = {}): PopulationItem => ({
  applicable: true,
  evaluable: true,
  satisfying: true,
  ...o,
});

describe('aggregateItems — count derivation', () => {
  it('empty population → not_applicable (§6.2 step 1)', () => {
    strictEqual(aggregateItems([], { zeroState: 'not_detected' }).state, 'not_applicable');
  });

  it('derives A, E, S from a mixed population', () => {
    const items: PopulationItem[] = [
      item({ satisfying: true }), //   applicable, evaluable, satisfying
      item({ satisfying: false }), //  applicable, evaluable, not satisfying
      item({ evaluable: false }), //   applicable, not evaluable
      item({ applicable: false }), //  not applicable
    ];
    const result = aggregateItems(items, { zeroState: 'not_detected' });
    strictEqual(result.itemsApplicable, 3);
    strictEqual(result.itemsEvaluated, 2);
    strictEqual(result.itemsSatisfying, 1);
    strictEqual(result.state, 'partial');
  });

  it('ignores satisfying/violation flags on a non-evaluable item', () => {
    // A satisfying+violation flag on a non-evaluable item must not count either way.
    const items: PopulationItem[] = [
      item({ evaluable: false, satisfying: true, violation: true }),
      item({ satisfying: true }),
    ];
    const result = aggregateItems(items, { zeroState: 'not_detected' });
    strictEqual(result.itemsApplicable, 2);
    strictEqual(result.itemsEvaluated, 1);
    strictEqual(result.itemsSatisfying, 1);
    strictEqual(result.state, 'pass'); // the one evaluable item satisfies; the ignored violation did not fire
  });
});

describe('aggregateItems — violations', () => {
  it('an item-level violation forces fail even when all evaluable items satisfy', () => {
    const items: PopulationItem[] = [item(), item({ violation: true })];
    strictEqual(aggregateItems(items, { zeroState: 'not_detected' }).state, 'fail');
  });

  it('a population-level violation forces fail when there is an evaluable item', () => {
    const items: PopulationItem[] = [item(), item()];
    strictEqual(
      aggregateItems(items, { zeroState: 'not_detected', populationViolation: true }).state,
      'fail',
    );
  });

  it('a population-level violation never overrides not_applicable', () => {
    strictEqual(
      aggregateItems([], { zeroState: 'not_detected', populationViolation: true }).state,
      'not_applicable',
    );
  });

  it('a population-level violation never overrides not_evaluated', () => {
    const items: PopulationItem[] = [item({ evaluable: false }), item({ evaluable: false })];
    strictEqual(
      aggregateItems(items, { zeroState: 'fail', populationViolation: true }).state,
      'not_evaluated',
    );
  });
});

describe('aggregateItems — declared-list signals (§6.4)', () => {
  // The population is the declared list; each member is an item, satisfying when present.
  const asMembers = (present: boolean[]): PopulationItem[] =>
    present.map((p) => item({ satisfying: p }));

  it('all members present → pass', () => {
    strictEqual(
      aggregateItems(asMembers([true, true, true, true, true]), { zeroState: 'not_detected' })
        .state,
      'pass',
    );
  });
  it('at least one but not all → partial', () => {
    strictEqual(
      aggregateItems(asMembers([true, false, false, false, false]), { zeroState: 'not_detected' })
        .state,
      'partial',
    );
  });
  it('none present → the declared zero state (not_detected)', () => {
    strictEqual(
      aggregateItems(asMembers([false, false, false, false, false]), { zeroState: 'not_detected' })
        .state,
      'not_detected',
    );
  });
});

describe('aggregateItems — order independence and determinism (§5.4, tests/README §3 Layer 5)', () => {
  const population: PopulationItem[] = [
    item({ satisfying: true }),
    item({ satisfying: false }),
    item({ evaluable: false }),
    item({ applicable: false }),
    item({ satisfying: true }),
  ];

  it('the result is invariant to item order', () => {
    const forward = aggregateItems(population, { zeroState: 'fail' });
    const reversed = aggregateItems([...population].reverse(), { zeroState: 'fail' });
    deepStrictEqual(forward, reversed);
  });

  it('the same input scored twice returns an identical result', () => {
    const a = aggregateItems(population, { zeroState: 'fail' });
    const b = aggregateItems(population, { zeroState: 'fail' });
    deepStrictEqual(a, b);
  });
});

describe('type-level: ZeroState is constrained to the two zero states', () => {
  it('accepts not_detected and fail as zero states', () => {
    const presence: ZeroState = 'not_detected';
    const correctness: ZeroState = 'fail';
    strictEqual(aggregate(input({ zeroState: presence })).state, 'not_applicable');
    strictEqual(aggregate(input({ zeroState: correctness })).state, 'not_applicable');
  });
});
