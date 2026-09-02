# Security Model — Phase 01

## Threat model for this phase

The browser AI agent is treated as **semi-trusted**: it can read
everything a human operator can read, and can perform investigative /
proposing actions, but it must never be able to single-handedly commit the
system to a consequential, hard-to-reverse action. Phase 01 has no
external content ingestion yet (no Tavily/Vapi/Apify), so "prompt
injection from a web page" is not yet a live vector -- but the boundary is
built now so those adapters can be added later without weakening it.

## The human-approval boundary

**Invariant: a ResponsePlan can only reach `APPROVED`/`EXECUTING` through
`ApproveResponsePlan`, which is (a) policy-gated to human callers and (b)
never registered as a WebMCP tool.**

Two independent layers enforce this, so a bug in one does not silently
remove the guarantee:

1. **Application-layer policy check.** `approveResponsePlan` and
   `rejectResponsePlan` (`packages/application/src/use-cases/`) pass
   `policyCheck: requireHumanCaller` to the shared execution pipeline.
   `requireHumanCaller` throws `UnauthorizedActionError` unless
   `caller.actorKind === "HUMAN"`. `packages/webmcp` always calls the API
   as itself (never claims `actorKind: "HUMAN"` -- see
   `apps/api/src/app.ts`'s `callerFromRequest`, which only the human-facing
   HTTP surface uses), so even if a tool existed, the pipeline would still
   refuse it.
2. **No such WebMCP tool exists.** `packages/webmcp/src/tools.ts`'s
   `ALL_TOOLS` contains exactly the 10 tools listed in `docs/WEBMCP.md`.
   There is no `approve_response_plan`, `reject_response_plan`,
   `apply_disruption`, or `verify_operation`. This is asserted by
   `packages/webmcp/src/__tests__/tools.test.ts`.

`apps/web/src/components/ApprovalDrawer.tsx` is the only UI surface that
can cross this boundary, and it calls the API directly
(`useCommandCenterStore.approvePlan/rejectPlan` → `POST
/api/scenarios/:id/plans/:id/approve|reject`), never through
`packages/webmcp`.

## The trust model for external information

Signals never become operational truth automatically. The lifecycle is:

```
OBSERVED → CORROBORATED → PROPOSED_FACT → ACCEPTED | REJECTED
```

with trust level `UNTRUSTED → CORROBORATED → HUMAN_VERIFIED`
(`packages/domain/src/entities/signal.ts`). An agent can propose a fact
(`ProposeOperationalFact`) from corroborated signals, but the fact only
reaches `ACCEPTED`/`HUMAN_VERIFIED` when the caller is a human -- an
agent-proposed fact stops at `PROPOSED_FACT` and waits for review.
External claim text is always treated as **data**, never as an
instruction, anywhere in this codebase.

## Idempotency

Every mutating command requires an `operationId`
(`packages/application/src/execution/pipeline.ts`). Replaying the same
`operationId` returns the previously computed `UseCaseResult` without
re-running the handler, so retries (from a flaky network, a re-dispatched
WebMCP tool call, or a double-click in the UI) can never duplicate a state
mutation, a domain event, or an audit entry.

## Machine-readable failures

Every failure surfaced to an agent or the UI is a structured
`AgentToolResult` failure (`ok: false`, `error: {code, message,
recoverable, recommendedAction}`) -- never a bare thrown error or
prose-only message. See `packages/contracts/src/agent-tool-result.ts` and
`packages/domain/src/errors.ts`'s typed `DomainError` hierarchy.

## Deferred to later phases

Authentication/authorization, rate limiting, CSRF protection on the API,
and untrusted-content sanitization for Tavily/Vapi/Apify inputs are
explicitly out of scope for Phase 01 (see the top-level task prompt and
`docs/tasks/`). The ports and boundaries above are designed so adding them
later is additive, not a redesign.
