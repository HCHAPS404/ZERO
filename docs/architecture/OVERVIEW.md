# Architecture Overview — Phase 01

ZERO is an **Agent-Native Multi-Hazard Crisis Operations Digital Twin**.
Human operators and a browser AI agent (via WebMCP) interact with the same
authoritative operational world. The agent can investigate, correlate,
simulate and propose; consequential decisions (approving a response plan)
remain under explicit human authority.

## Style: Modular Monolith + Hexagonal Architecture

Dependency direction is one-way:

```
Infrastructure / Adapters / UI
        ↓
    Application
        ↓
      Domain
```

- **Domain** (`packages/domain`) has zero runtime dependencies beyond
  TypeScript itself. No React, Hono, Node HTTP, WebMCP, PostgreSQL,
  Drizzle, or any external provider.
- **Application** (`packages/application`) depends only on Domain and
  Contracts (zod schemas + the `AgentToolResult` envelope). It defines
  **ports** (interfaces) for everything infrastructure-shaped and contains
  every use case as a plain async function built on a shared execution
  pipeline (`src/execution/pipeline.ts`).
- **Adapters** implement those ports: `@zero/routing` (A* routing),
  `@zero/planner` (deterministic response planner), `@zero/simulation`
  (what-if engine), `@zero/persistence` (in-memory now, Postgres/Drizzle
  prepared), `@zero/webmcp` (the browser-agent tool surface).
- **UI/composition** (`apps/api`, `apps/web`) is the only layer allowed to
  know about every concrete adapter. `apps/api/src/composition.ts` is the
  literal composition root.

## Package map

```
packages/domain          entities, state machines, versioned world, typed errors
packages/contracts        AgentToolResult envelope, zod input schemas, WhatIfMutation
packages/application       ports, execution pipeline, all 15 use cases
packages/routing            GraphAStarRoutingAdapter (implements RoutingEnginePort)
packages/planner             DeterministicResponsePlanner (implements ResponsePlannerPort)
packages/simulation            InMemoryWhatIfSimulationAdapter (implements WhatIfSimulationPort)
packages/persistence             in-memory repositories + Drizzle/Postgres schema (prepared)
packages/webmcp                    the 10-tool WebMCP adapter (thin HTTP client, no business logic)
scenarios/earthquake-alpha           deterministic demo scenario
apps/api                                Hono composition root + HTTP routes
apps/web                                 React 19 Command Center
evals/                                    deterministic agent-journey definitions
docs/                                      this documentation
```

## The versioned OperationalWorld

`OperationalWorld` (packages/domain/src/world.ts) is the single
authoritative representation of the operational picture. It is never
mutated in place: every meaningful change (`upsertIncident`,
`setRoadSegmentStatus`, ...) returns a **new** `OperationalWorld` with
`version` incremented. A `ResponsePlan` records the `basisWorldVersion` it
was computed against; `assertWorldVersion` throws a typed `StaleWorldError`
(`code: "STALE_WORLD"`, `recoverable: true`, `recommendedAction: "REPLAN"`)
the moment a plan is staged against a world that has since moved on.
`OperationalSnapshot` is an immutable, read-only point-in-time copy handed
to planners and the what-if engine — it can never be written back through
world-mutation helpers.

## The execution pipeline

Every use case runs through one shared pipeline
(`packages/application/src/execution/pipeline.ts`):

```
input validation (zod)
  → semantic validation (in the handler)
  → policy check (e.g. requireHumanCaller)
  → world-version check (assertWorldVersion, where relevant)
  → handler: domain invariants + persistence
  → domain events appended
  → audit entry appended
  → structured UseCaseResult<T>
```

Both `apps/api`'s HTTP routes and `packages/webmcp`'s tools call these
exact same use-case functions -- there is exactly one business-logic path
for humans and agents alike.

## Two front doors, one backend

- **apps/web** (human UI) calls `apps/api`'s HTTP routes directly.
- **packages/webmcp** (browser agent) is a thin HTTP client that calls the
  *same* `apps/api` routes. It carries no application-layer or
  infrastructure-package dependency at all -- see
  `packages/webmcp/package.json`. This is what guarantees "no duplicated
  business logic": the WebMCP tool for staging a plan and the UI's "Stage"
  button hit the identical endpoint.

See `docs/WEBMCP.md` and `docs/SECURITY.md` for the human-approval boundary
this enables.

## What is deliberately NOT here yet

Tavily, Apify, Vapi, ElevenLabs, n8n, authentication, and a production
MapLibre map are out of scope for Phase 01 by design (see
`docs/tasks/`). The architecture is shaped so each can be added as a new
adapter/port implementation without touching Domain or Application.
