# TASK-RENDER-REALTIME

## Objective

Wire a WebSocket transport on top of the existing in-process
`ScenarioRoom` abstraction (`apps/api/src/realtime/scenario-room.ts`) so
`apps/web` receives live updates (plan approved, disruption applied, agent
focus directive) without polling.

## Allowed areas/files

- `apps/api/src/app.ts` (add a WebSocket route, e.g. via `@hono/node-ws`
  or a raw `ws` server mounted alongside the Hono `serve()` call in
  `apps/api/src/server.ts`)
- `apps/api/src/realtime/**`
- `apps/web/src/state/store.ts` (subscribe to the socket, merge
  `RoomMessage`s into state)
- New file `apps/web/src/realtime/socket-client.ts`

## Explicitly out of bounds

- `packages/application/**` -- use cases must keep returning a
  `UseCaseResult` synchronously to their caller; realtime broadcast is a
  side effect the *route handler* triggers (see the existing
  `app.scenarioRoom.publish(...)` calls after `approveResponsePlan` and
  `applyDisruption` in `apps/api/src/app.ts` for the pattern to extend),
  not something a use case does itself.
- Do not introduce a cloud-specific pub/sub SDK (e.g. a managed
  WebSocket/Pusher service) -- `ScenarioRoom` is deliberately
  provider-agnostic; a plain `ws`/Node WebSocket server on the existing
  Render Node service is the target.

## Dependencies

- `apps/api/src/realtime/scenario-room.ts`'s `RoomMessage` type and
  `ScenarioRoom.subscribe`/`publish`
- Existing `publish` call sites in `apps/api/src/app.ts` (approve,
  disruption, focus) -- extend to cover stage/reject/correlate too if
  useful

## Contracts implemented

- Define a `RealtimeEnvelope` (or reuse `RoomMessage` directly) as the
  wire format sent over the socket; document it in `docs/WEBMCP.md` or a
  new `docs/REALTIME.md` if the shape diverges from `RoomMessage`.

## Acceptance criteria

- Opening `apps/web` shows plan approvals from another tab/session live,
  without a manual refresh.
- The socket reconnects automatically after a dropped connection.
- `pnpm --filter @zero/api build` and `pnpm --filter @zero/web build`
  both still pass with no new required environment variables for local
  dev (the socket should just work against `pnpm dev` in both apps).

## Tests

- `apps/api/src/__tests__/` -- test that `ScenarioRoom.publish` reaches a
  subscribed listener (unit-level, no real socket needed).
- A lightweight integration test opening a real WebSocket against a
  test-started Hono server, if the chosen library supports it cleanly.

## Non-goals

- Authenticating the WebSocket connection (no auth in Phase 01/02 per the
  original brief) -- revisit once auth is in scope.
