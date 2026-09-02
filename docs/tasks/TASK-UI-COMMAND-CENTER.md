# TASK-UI-COMMAND-CENTER

## Objective

Take the structural Command Center built in Phase 01
(`apps/web/src/components/*`) and turn it into a polished, usable
operational interface: better layout density, loading/empty/error states,
keyboard navigation for the incident list, toast notifications for
mutations, and visual polish consistent with an operational tool (not a
marketing SaaS page).

## Allowed areas/files

- `apps/web/src/**` (components, styles, state)
- May add new components under `apps/web/src/components/`
- May restructure `apps/web/src/styles.css` into per-component CSS modules
  if that improves maintainability

## Explicitly out of bounds

- `apps/api/**`, any `packages/**` -- if the UI needs a new field from the
  API, open a separate, scoped change to `apps/api/src/app.ts` and note it
  in the PR description rather than reaching into application/domain code.
- `packages/webmcp/**` -- the WebMCP tool surface is not a UI concern.

## Dependencies

- `apps/web/src/api/client.ts` (existing fetch client)
- `apps/web/src/state/store.ts` (existing Zustand store) -- extend it,
  don't bypass it with ad hoc fetches in components.

## Contracts consumed

- `AgentToolResult<T>` shape from every `apps/api` endpoint
  (`packages/contracts/src/agent-tool-result.ts`)
- The `OperationalPicture`, `PlanSummary`, `SignalSummary`,
  `AuditEntrySummary` shapes already declared in `apps/web/src/state/
  store.ts`

## Contracts implemented

None -- this is a pure UI task.

## Acceptance criteria

- `pnpm --filter @zero/web typecheck && pnpm --filter @zero/web build`
  pass.
- Every store action that can fail (`stagePlan`, `approvePlan`,
  `rejectPlan`, `correlateSignals`, `generatePlans`) shows the resulting
  error to the user, not just `console`.
- Loading states are visible during the initial `loadAll()` and during
  each mutating action.
- The human-approval boundary comment in `ApprovalDrawer.tsx` is preserved
  and the drawer still calls the API directly (never `@zero/webmcp`).

## Tests

- Add component-level tests if a testing library is introduced (not
  present in Phase 01); at minimum, `pnpm --filter @zero/web build` must
  succeed as a regression gate.

## Non-goals

- Do not add authentication.
- Do not replace the map placeholder -- that's `TASK-MAP-MAPLIBRE.md`.
- Do not add realtime/WebSocket wiring -- that's `TASK-RENDER-REALTIME.md`.
