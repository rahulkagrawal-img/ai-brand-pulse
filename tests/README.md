# Test Strategy

| | |
|---|---|
| **Version** | 0.1 — Milestone 0 |
| **Status** | Strategy only. **No tests exist yet, because no code exists yet** |
| **Governs** | `docs/engineering-rules.md` §6 |

---

## 1. Why this document exists before any test

The next implementation target is the deterministic core:

```text
structured evidence
        ↓
deterministic scoring
        ↓
category scores
        ↓
overall score
```

That pipeline is the one asset worth building *before* the validation gate, because it survives
BUILD, PIVOT and HOLD alike. Its value depends entirely on being **reproducible and auditable** —
which is a testing property. So the test contract is specified first.

---

## 2. The hard constraint

The scoring engine must be fully testable with **no internet access, no LLM, no database, no payment
service and no authentication.**

| Not required | Why the test never needs it |
|---|---|
| Internet | Evidence is an input, not something the engine fetches |
| LLM | No model call exists anywhere in the scoring path (`engineering-rules.md` §4) |
| Database | The engine is a pure function; it stores nothing |
| Payments | Payment is a later milestone and is not a scoring concern |
| Authentication | There are no users in the scoring path |
| A clock | Time-relative logic reads `metadata.as_of` from the evidence |

**If a test for the scoring engine needs any of the above, the boundary is in the wrong place** —
fix the architecture, not the test.

---

## 3. Test layers

### Layer 1 — Signal derivation tests (the bulk of the work)

One test module per signal. For each signal, cover **every reachable state**, including the ones easy
to forget:

| Case | Must be tested |
|---|---|
| `pass` | Yes |
| `partial` | Yes, where the rubric defines it |
| `fail` | Yes, where the rubric defines it |
| `not_detected` | **Yes** — evidence present, target absent |
| `not_applicable` | **Yes** — the applicability rule fires |
| `not_evaluated` | **Yes** — evidence missing, or `THRESHOLD-TBD` |
| `evidence_refs` | **Non-empty for every state except `not_evaluated`** |

A signal with an untested `not_evaluated` branch is untested, whatever a coverage percentage says —
those branches are exactly where honest uncertainty silently turns into a zero.

Signal tests take a **minimal evidence object**, not a whole fixture. A `PRD-03` test should read as
four lines of evidence and an expected state; loading an eight-page site to check whether a price is
present obscures what is being asserted.

### Layer 2 — Dimension scoring tests

Given a set of signal states and weights, assert the dimension score, coverage and confidence label.
These are arithmetic tests over synthetic signal sets — no fixtures needed.

Must cover: all-pass · all-fail · mixed · weight redistribution when signals are excluded · every
coverage band boundary (0.80, 0.50, 0.01, 0) · a dimension with zero applicable signals (unscored).

### Layer 3 — Overall score tests

Dimension scores in, overall out. Must cover: all five dimensions scored · one unscored with
redistribution · two unscored (`issuable = false`) · rounding at boundaries, with at least one case
where round-half-away-from-zero differs from banker's rounding (e.g. 72.25 → 72.3, not 72.2). That
case is the one that catches a language's default rounding behaviour leaking in.

### Layer 4 — Fixture / end-to-end tests

Whole evidence records through the whole deterministic pipeline. Purpose: regression protection and
proof that the layers compose — **not** primary rule verification, which belongs in Layer 1.

Each fixture asserts: the full signal-state map · dimension scores · coverage and confidence ·
overall score · `issuable`.

### Layer 5 — Property and invariant tests

Properties that must hold for **every** input:

1. **Determinism.** Scoring the same record twice returns identical output, byte for byte.
2. **Order independence.** Evaluating signals in a different order changes nothing.
3. **Range.** Every score is within 0–100, or `null` for an unscored dimension.
4. **Weight conservation.** Effective dimension weights sum to 1.0 across scored dimensions.
5. **Traceability.** Every signal not in `not_evaluated` has non-empty `evidence_refs`.
6. **Monotonicity.** Improving one signal's state (e.g. `fail` → `partial`) never lowers the
   dimension score, all else equal. A rubric that violates this has a bug in its weights, and this
   test is how it gets found.
7. **Purity.** No network, filesystem, clock or environment access during scoring — asserted by
   running with those faculties stubbed to throw.
8. **Injection inertness.** Evidence strings containing instruction-like text produce exactly the
   same scores as benign strings of the same shape.

---

## 4. How expected values are produced

**Never by running the engine and recording what it printed.** That tests that the code does what it
does.

1. Derive the expected **signal states** by hand from `docs/scoring-rubric.md`, one signal at a time,
   and commit those assertions first.
2. Once states are agreed, compute the expected **scores** by hand from rubric §3.
3. Commit them as a regression baseline, with the hand computation in a comment where it is not
   obvious.
4. When a baseline changes, the diff must be explained by a **rubric version bump** — otherwise it is
   a regression, and updating the expectation to match new behaviour is how a scoring engine quietly
   stops being auditable.

---

## 5. What is deliberately NOT tested here

| Not tested | Why | Where it goes |
|---|---|---|
| Crawling and fetching | Does not exist; must never be in the scoring path | M2, with `engineering-rules.md` §5 as its specification |
| LLM output quality | Non-deterministic by nature; not a unit-test concern | M3 — evaluated with a review rubric, not assertions |
| Report rendering | Not built | M4 — but the three mandatory limitation statements (`audit-spec.md` §11) **must** be asserted once rendering exists |
| Payments, auth, delivery | Not built, not approved | Post-gate |

---

## 6. Running the tests

**Pending the language decision** (`engineering-rules.md` §9, O-1 — the single open decision blocking
Milestone 1). Once taken, this section states the exact command and nothing more exotic than the
ecosystem default runner. No custom test harness.

The contract that command must satisfy, whatever it turns out to be:

- Runs offline, with the network unavailable.
- Runs with no configuration, no secrets and no `.env`.
- Completes in seconds, so it can run on every save.
- Deterministic: identical results across machines and runs, with no ordering flakiness.

---

## 7. Definition of done for Milestone 1

The scoring engine is complete when:

1. Every non-`THRESHOLD-TBD` signal in the rubric has a derivation implementation and tests for all
   its reachable states.
2. Every `THRESHOLD-TBD` signal returns `not_evaluated` and has a test asserting exactly that.
3. All three fixtures score end-to-end with committed, hand-derived expectations.
4. All eight invariants in §3 Layer 5 hold.
5. Every audit record the engine emits can answer the six auditability questions in
   `docs/scoring-rubric.md` §12.
6. The whole suite runs offline, without an LLM, a database or a login.
