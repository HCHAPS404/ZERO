# TASK-ELEVENLABS-BRIEFING

## Objective

Add an ElevenLabs-backed adapter that synthesizes a spoken briefing (audio)
from the current `OperationalPicture` and/or a `ResponsePlan`'s
`explanationComponents`, for playback in the Command Center (e.g. a
"Brief me" button in `apps/web`).

## Allowed areas/files

- New package `packages/voice-elevenlabs/`
- `packages/application/src/ports/` -- add a new `VoiceSynthesisPort`
- `apps/api/src/app.ts` -- a new read-only route, e.g. `POST
  /api/scenarios/:id/briefing/audio`, returning an audio URL or stream
- `apps/web/src/components/` -- a small playback control consuming it

## Explicitly out of bounds

- `packages/domain/**` and `packages/application/src/use-cases/
  get-operational-picture.ts` -- do not change what
  `GetOperationalPicture` returns; this task consumes its existing output
  and formats it into briefing text, it does not change the use case.
- Do not put text-to-speech logic inside any existing use case. Add a new
  use case (e.g. `GenerateBriefing`) that reads via
  `GetOperationalPicture`/`ListSignals`/`CompareResponsePlans` and calls
  the new port -- keep TTS entirely inside the adapter package.

## Dependencies

- `packages/application/src/use-cases/get-operational-picture.ts`
- `packages/domain/src/entities/plan.ts`'s `explanationComponents` field
  (already populated by the planner -- see `packages/planner/src/
  planner.ts`) as good source text for a plan briefing

## Contracts implemented

- New `VoiceSynthesisPort` in `packages/application/src/ports/`:

  ```ts
  interface VoiceSynthesisPort {
    synthesize(text: string): Promise<{ audioUrl: string } | { audioBytes: Uint8Array; mimeType: string }>;
  }
  ```

## Acceptance criteria

- Briefing text is generated deterministically from existing structured
  data (picture counts, plan explanationComponents, unresolved signal
  count) -- not from an LLM free-text summary, to keep it auditable and
  consistent with `docs/ADR/0003-deterministic-planner-not-llm.md`'s
  spirit. An LLM-authored summary layer can be a separate future task.
- With no `ELEVENLABS_API_KEY` set, the briefing route/button is absent or
  clearly disabled -- no crash.
- Audio generation failures return a structured error (reuse the
  `AgentToolResult` failure shape), not a raw 500.

## Tests

- Unit tests for the briefing-text-generation logic (pure function, no
  network) independent of the ElevenLabs call.
- A mocked-adapter test confirming the route returns the expected shape.

## Non-goals

- Real-time streaming TTS during a live call (that's closer to
  `TASK-VAPI-FIELD-VOICE.md`'s territory if ever combined) -- this task is
  request/response briefing generation only.
