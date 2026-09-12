/**
 * The global aggregation rule — Scoring Rubric v1.0 §6.
 *
 * Every signal that evaluates more than one item (page, product, collection,
 * article, or member of a declared list) resolves its state through this single
 * algorithm. It is defined once here so that a bug is a bug in one place rather
 * than in 34 signals independently (engineering-rules.md D-11, tests/README §3
 * Layer 0).
 *
 * This module is pure arithmetic over counts. It has no dependencies, reads no
 * clock, does no I/O, and is order-independent — the determinism requirements of
 * rubric §5.4 are satisfied structurally because the only operations are integer
 * comparison and boolean OR, both of which are invariant to input order.
 */

/**
 * The six signal states — rubric §4. The vocabulary is closed: no signal may
 * introduce a seventh.
 *
 * Defined here because aggregation is the first and (in this milestone) only
 * consumer of the vocabulary. When a second consumer appears in the scoring
 * layer it may import from here or the type may move; it is not duplicated in
 * anticipation of that (engineering-rules.md §1, "abstract at the third").
 */
export const SIGNAL_STATES = [
  'pass',
  'partial',
  'fail',
  'not_detected',
  'not_applicable',
  'not_evaluated',
] as const;

export type SignalState = (typeof SIGNAL_STATES)[number];

/**
 * The state returned when a signal has evaluable items but none satisfy — rubric
 * §6.1 "Zero state". It is declared per signal: `not_detected` for presence
 * rules, `fail` for correctness rules. No other state may be a zero state.
 */
export type ZeroState = Extract<SignalState, 'not_detected' | 'fail'>;

/**
 * The counts the aggregation rule operates on — rubric §6.1.
 *
 * The hierarchy A ⊇ E ⊇ S is a precondition, not an assumption: evaluable items
 * are a subset of applicable items, and satisfying items a subset of evaluable
 * items. `aggregate` enforces it and throws rather than scoring nonsense.
 */
export interface AggregationInput {
  /** A — items in the population to which the rule can apply (§6.1). */
  applicable: number;
  /** E — applicable items whose required evidence fields are present (§6.1). */
  evaluable: number;
  /** S — evaluable items meeting the signal's *item satisfies when* condition (§6.1). */
  satisfying: number;
  /**
   * Whether a declared violation fired (§6.1, §6.2 step 3). Agnostic to scope:
   * `true` for an item-level violation on any evaluable item, or for a
   * population-level violation predicate (e.g. TEC-06 "every canonical points at
   * the homepage", TEC-07 "every page shares one title"). Consulted only after A
   * and E are confirmed non-zero, so it can never resurrect an inapplicable or
   * unevaluable signal.
   */
  violation: boolean;
  /** The state to return when S == 0, declared by the signal (§6.1). */
  zeroState: ZeroState;
}

/**
 * The outcome of aggregation. Carries the resolved state and the counts the
 * signal record must disclose — `itemsApplicable` and `itemsEvaluated` are
 * mandatory on any partially-evaluable signal (§6.3); `itemsSatisfying` is
 * included because findings and limitations are built from it.
 */
export interface AggregationResult {
  readonly state: SignalState;
  readonly itemsApplicable: number;
  readonly itemsEvaluated: number;
  readonly itemsSatisfying: number;
}

function assertCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`aggregation: ${name} must be a non-negative integer, received ${value}`);
  }
}

/**
 * Resolve a signal's state from its population counts — rubric §6.2.
 *
 * The step order is load-bearing and is asserted by the tests: violations are
 * checked *after* applicability and evaluability but *before* proportion, which
 * is what resolves v0.1's branch collisions (a page set that satisfied both a
 * `pass` and a `fail` clause). Violations beat proportion; they never override
 * `not_applicable` or `not_evaluated`.
 *
 * @throws RangeError if the counts are not non-negative integers or violate the
 *         A ⊇ E ⊇ S hierarchy.
 */
export function aggregate(input: AggregationInput): AggregationResult {
  const { applicable, evaluable, satisfying, violation, zeroState } = input;

  assertCount('applicable', applicable);
  assertCount('evaluable', evaluable);
  assertCount('satisfying', satisfying);
  if (evaluable > applicable) {
    throw new RangeError(
      `aggregation: evaluable (${evaluable}) cannot exceed applicable (${applicable})`,
    );
  }
  if (satisfying > evaluable) {
    throw new RangeError(
      `aggregation: satisfying (${satisfying}) cannot exceed evaluable (${evaluable})`,
    );
  }

  // Rubric §6.2 — evaluated in this exact order.
  let state: SignalState;
  if (applicable === 0) {
    state = 'not_applicable'; // 1
  } else if (evaluable === 0) {
    state = 'not_evaluated'; // 2
  } else if (violation) {
    state = 'fail'; // 3 — violations beat proportion
  } else if (satisfying === evaluable) {
    state = 'pass'; // 4
  } else if (satisfying > 0) {
    state = 'partial'; // 5
  } else {
    state = zeroState; // 6 — S == 0
  }

  return {
    state,
    itemsApplicable: applicable,
    itemsEvaluated: evaluable,
    itemsSatisfying: satisfying,
  };
}

/**
 * One item of a signal's population — rubric §6.1. Used by signals that classify
 * a concrete list of pages, products, or declared-list members (§6.4) rather
 * than computing counts directly.
 *
 * The flags are hierarchical and lower flags are only meaningful when the higher
 * one holds: `evaluable` is read only when `applicable`, `satisfying` and
 * `violation` only when `evaluable`. A `satisfying` flag on a non-evaluable item
 * is ignored, not an error — it cannot satisfy a rule whose evidence is absent.
 */
export interface PopulationItem {
  /** In the population and the rule can apply to this item. */
  applicable: boolean;
  /** Required evidence fields for this item are present. Read only when applicable. */
  evaluable: boolean;
  /** This item meets the *item satisfies when* condition. Read only when evaluable. */
  satisfying: boolean;
  /** This item triggers a declared item-level violation. Read only when evaluable. */
  violation?: boolean;
}

/**
 * Derive counts from a classified population and aggregate them (§6.1, §6.3–6.5).
 *
 * Handles single-item signals (§6.5, a one-element array) and declared-list
 * signals (§6.4, one item per list member) with no special casing — the rubric
 * is explicit that the identical algorithm applies to all three.
 *
 * @param populationViolation a population-level declared violation that is not
 *        attributable to one item (e.g. "two or more host variants return 200").
 *        Combined with any item-level violation by OR. Like all violations it is
 *        consulted only when there is at least one evaluable item.
 */
export function aggregateItems(
  items: readonly PopulationItem[],
  options: { zeroState: ZeroState; populationViolation?: boolean },
): AggregationResult {
  let applicable = 0;
  let evaluable = 0;
  let satisfying = 0;
  let violation = options.populationViolation ?? false;

  for (const item of items) {
    if (!item.applicable) continue;
    applicable += 1;
    if (!item.evaluable) continue;
    evaluable += 1;
    if (item.violation === true) violation = true;
    if (item.satisfying) satisfying += 1;
  }

  return aggregate({ applicable, evaluable, satisfying, violation, zeroState: options.zeroState });
}
