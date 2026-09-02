# ADR 0003: Deterministic Constrained-Search Planner, Not an LLM Planner

## Status

Accepted (Phase 01).

## Context

`GenerateResponsePlans` must assign scarce resources (ambulances, engines,
USAR teams, a drone) to incidents under hard constraints (capability
match, district reserve floors) and produce three comparably-scored
strategy profiles (FASTEST, BALANCED, LOWEST_RISK). An LLM could plausibly
produce a plausible-looking assignment, but:

- it cannot guarantee a hard constraint (e.g. "District North must retain
  at least one ambulance") is never silently violated;
- identical input would not reliably produce identical output, which
  breaks reproducible tests, `docs/architecture/OVERVIEW.md`'s
  determinism story, and the eval journeys in `evals/`;
- it introduces an external-API dependency and latency into the
  authorization-adjacent path that leads to `StageResponsePlan`.

## Decision

`packages/planner`'s `DeterministicResponsePlanner` uses a fixed
severity-ordered, constrained-greedy assignment algorithm (see
`packages/planner/src/planner.ts`): incidents are processed in a
deterministic order (severity, then casualty estimate, then id), and for
each, the best available, capability-matched, reachable resource is
selected under a strategy-specific cost function, preferring candidates
that do not breach a district reserve constraint. No LLM and no external
optimization service are used anywhere in the planning path. A plan that
still had to breach a reserve constraint (because no alternative existed)
carries an explicit `ConstraintViolation` and is blocked from reaching
`VALIDATED` by a domain-level invariant
(`packages/domain/src/entities/plan.ts`'s `transitionPlan`).

## Consequences

- Given the same `OperationalSnapshot` and constraints, the planner always
  produces the same plans -- verified directly by a determinism test
  (`packages/planner/src/__tests__/planner.test.ts`).
- The algorithm is a greedy heuristic, not a global optimum solver; it is
  documented as comprehensible and auditable rather than provably optimal,
  which was an explicit requirement.
- If a future phase wants an LLM-assisted *proposal* step, it should be
  layered as something that produces candidate constraints or
  re-prioritizations for this planner to consume -- not as a replacement
  for the planner itself, to preserve the hard-constraint guarantee.
