# ADR 0002: WebMCP Tools as a Thin HTTP Client, Not a Second Backend

## Status

Accepted (Phase 01).

## Context

The product's core premise is that a browser AI agent and a human operator
act on the *same* operational world. The obvious wrong way to build this
is to give `packages/webmcp` its own copy of the application use cases
(wired to its own in-memory repositories), because that immediately
produces two divergent sources of truth and doubles the surface that has
to be kept behaviorally identical -- including, critically, the
human-approval boundary (ADR 0004).

## Decision

`packages/webmcp` depends on `@zero/domain` (types only) and
`@zero/contracts` (the `AgentToolResult` envelope and zod schemas) --
nothing else. Every tool's `execute` function is a validated `fetch` call
to an `apps/api` HTTP route. `apps/api`'s route handlers are themselves
thin (extract input, call one application use case, translate the result
to HTTP), so the WebMCP tool and the equivalent UI action always run
through the identical use-case function.

Tool registration is behind a `WebMcpProvider` seam
(`packages/webmcp/src/provider.ts`) with a browser implementation (calls
the emerging `navigator.modelContext.registerTool` API) and an in-memory
mock used automatically wherever no browser WebMCP global exists, so
Node/Vitest/CI never depend on a real browser.

## Consequences

- Zero duplicated business logic between the agent and human paths, by
  construction, not by discipline.
- The WebMCP tool surface can only ever expose what `apps/api` exposes as
  an HTTP route -- which makes the human-approval boundary (ADR 0004)
  trivially auditable: check `packages/webmcp/src/tools.ts`'s `ALL_TOOLS`
  list.
- The tradeoff is an extra network hop for agent actions versus a direct
  in-process call. At Phase 01's scale this is immaterial; if it ever
  matters, the fix is a faster `apps/api`, not bypassing it.
- The exact upstream WebMCP registration contract is still evolving, so
  `BrowserWebMcpProvider` currently sends a placeholder JSON Schema.
  Tracked in `docs/tasks/TASK-WEBMCP-EVALS.md`.
