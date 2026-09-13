/**
 * Signal derivation contract — `audit-spec.md` §7.2, `scoring-rubric.md` §4 and §6.
 *
 * This module records the return-type contract for Phase 3 signal functions. It
 * defines a type only; no signal is implemented here (that is Phase 3). It exists
 * now so the derivation boundary is fixed before any signal is written, and so
 * `evidence_refs` has one documented representation.
 *
 * A signal function is a PURE map from the evidence record to a `SignalResult`
 * (Phase 3 planning, decision D-1): same evidence in, same result out — no network,
 * no clock, no LLM (`engineering-rules.md` §3). It classifies its population, resolves
 * a state through the §6 aggregation rule, and attaches the evidence that produced it.
 *
 * The state vocabulary and the item counts are NOT redeclared here — they are the
 * `AggregationResult` produced by `./aggregation.ts` (rubric §6), aggregation being
 * their first consumer. A `SignalResult` is that result plus the two things the pure
 * count arithmetic cannot know: which evidence produced the state, and which rule
 * branch fired (`engineering-rules.md` §1, "abstract at the third").
 */

import type { AggregationResult, SignalState } from './aggregation.ts';

export type { SignalState };

/**
 * What a signal derivation function returns (Phase 3 planning, decision D-1).
 *
 * Extends `AggregationResult` (the §6 state and item counts) with the derivation's
 * own outputs: the evidence refs and the reason. It does NOT carry `value`, `weight`,
 * `type`, or the review/override fields — those are added by later layers (`value`
 * and `weight` by scoring, the rest by review/assembly), so the deterministic
 * derivation cannot depend on them. The full record shape is `audit-spec.md` §7.2;
 * mapping this in-memory result onto that record's snake_case fields (and nulling the
 * item counts for single-item signals per §7.2) is a later step.
 */
export interface SignalResult extends AggregationResult {
  /**
   * JSON Pointer strings (RFC 6901) resolving against the audit record
   * (Phase 3 planning, decision D-2; `audit-spec.md` §7.2 / AQ-6). Required and
   * non-empty for any state other than `not_evaluated` (`audit-spec.md` §7.2).
   */
  readonly evidenceRefs: readonly string[];

  /** Which rule branch fired — the human-readable derivation reason. */
  readonly reason: string;
}
