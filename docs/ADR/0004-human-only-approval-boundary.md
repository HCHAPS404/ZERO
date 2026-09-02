# ADR 0004: Human-Only Approval Boundary

## Status

Accepted (Phase 01). This is the single most important invariant in the
system and is treated as non-negotiable for any future change.

## Context

The project's stated premise is "the browser agent may investigate,
reason, simulate, compare and propose. Consequential decisions remain
under explicit human authority." Approving a response plan commits real
resources (ambulances, fire engines, USAR teams) to real incidents. If an
agent -- whether through a legitimate misunderstanding, a bug, or a future
prompt-injection vector once external content ingestion (Tavily/Vapi/
Apify) is added -- could approve a plan, the "human authority" premise
would be false in practice regardless of what the documentation claimed.

## Decision

Two independent, redundant enforcement layers:

1. **Application-layer policy check.** `ApproveResponsePlan` and
   `RejectResponsePlan` (`packages/application/src/use-cases/`) pass
   `policyCheck: requireHumanCaller` into the shared execution pipeline,
   which throws `UnauthorizedActionError` unless the caller's `actorKind`
   is `"HUMAN"`.
2. **No WebMCP tool exists for it.** `packages/webmcp/src/tools.ts`'s
   `ALL_TOOLS` never includes `approve_response_plan`,
   `reject_response_plan`, `apply_disruption`, or `verify_operation`.
   `packages/webmcp`'s own tests assert this directly (tool count == 10,
   forbidden names absent).

The only caller that can ever present `actorKind: "HUMAN"` is
`apps/api`'s HTTP layer (`callerFromRequest` in `apps/api/src/app.ts`),
which is only reachable from `apps/web`'s human-operated UI (or a human
using `curl`/Postman directly against the API -- also a human).

## Consequences

- An agent can get a plan as far as `AWAITING_APPROVAL` (via
  `stage_response_plan`) and no further. Approving or rejecting always
  requires a human action through `apps/web/src/components/
  ApprovalDrawer.tsx` or an equivalent direct human API call.
- A single bug removing one layer (e.g. someone accidentally wiring an
  approval route into WebMCP) is still caught by the other
  (`requireHumanCaller` would reject the AGENT-tagged caller).
- This constrains any future adapter: nothing that lets an agent claim
  `actorKind: "HUMAN"` may ever be added without an explicit, separate,
  reviewed decision overriding this ADR.
