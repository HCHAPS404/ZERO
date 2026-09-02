# TASK-N8N-EFFECTS

## Objective

Add an n8n-backed adapter so approved/executing operations can trigger
external effects (e.g. a Slack notification to a dispatch channel, an SMS
to a facility, a calendar hold) via n8n workflows, without embedding
workflow logic in the application layer.

## Allowed areas/files

- New package `packages/effects-n8n/`
- `packages/application/src/ports/` -- add a new `ExternalEffectsPort`
- `apps/api/src/app.ts` -- extend the existing `approveResponsePlan` route
  handler to also call the effects port after a successful approval (see
  the existing `app.scenarioRoom.publish(...)` call right after approval
  in `apps/api/src/app.ts` for where a side effect already gets
  triggered from a route handler)

## Explicitly out of bounds

- `packages/application/src/use-cases/approve-response-plan.ts` -- do not
  call n8n from inside the use case itself. Use cases stay
  infrastructure-free; triggering an external effect after a successful
  `ApproveResponsePlan` is a route-handler-level side effect, exactly like
  the existing `ScenarioRoom.publish` call.
- Do not give n8n workflows write access back into this system's mutating
  endpoints without going through the same human-approval boundary
  (`docs/SECURITY.md`) as every other caller -- an n8n workflow is not a
  human and must never be able to call `/plans/:id/approve`.

## Dependencies

- `apps/api/src/app.ts`'s `POST /api/scenarios/:id/plans/:planId/approve`
  handler (the natural trigger point)
- `ApprovalOutcome` type (`packages/application/src/use-cases/
  approve-response-plan.ts`) as the payload shape to forward

## Contracts implemented

- New `ExternalEffectsPort` in `packages/application/src/ports/`:

  ```ts
  interface ExternalEffectsPort {
    trigger(effectName: string, payload: Record<string, unknown>): Promise<void>;
  }
  ```

  Called from the route handler (or a thin post-approval hook), not from
  application use cases.

## Acceptance criteria

- Triggering an effect is fire-and-forget from the API's perspective: a
  slow or failing n8n workflow must never delay or fail the
  `ApproveResponsePlan` HTTP response.
- With no `N8N_WEBHOOK_URL` configured, nothing is called and nothing
  breaks.
- Effect payloads never include more than what's already public via the
  API response for that action (no accidental over-sharing of internal
  state to an external workflow).

## Tests

- Unit tests with a mocked HTTP client for the n8n webhook call.
- A test confirming a failing/slow effect call does not affect the
  `ApproveResponsePlan` use case's own result or timing in any
  observable way (i.e. it's genuinely decoupled, e.g. via
  `void triggerEffect(...)` / a queued dispatch rather than `await`ed
  inline).

## Non-goals

- Building a general workflow-authoring UI -- workflows are authored in
  n8n itself; this task only wires the trigger.
