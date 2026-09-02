# TASK-VAPI-FIELD-VOICE

## Objective

Add a Vapi-backed adapter that lets a field responder phone in a status
update, transcribes it, and turns it into a `Signal` (same trust pipeline
as every other signal source -- see `packages/domain/src/entities/
signal.ts`).

## Allowed areas/files

- New package `packages/field-voice-vapi/`
- `packages/application/src/ports/` -- add a new `FieldVoicePort`
- `apps/api/src/app.ts` -- a new webhook route (e.g. `POST
  /api/webhooks/vapi`) that Vapi calls when a call completes
- `apps/api/src/composition.ts` -- wire the adapter, gated behind
  `VAPI_API_KEY`/`VAPI_WEBHOOK_SECRET`

## Explicitly out of bounds

- `packages/domain/**` -- reuse `Signal`/`Provenance`
  (`sourceType: "FIELD_RADIO"` already exists and fits; add a new
  `SourceType` only if a phone call is meaningfully different).
- Do not let transcribed call content trigger any use case directly. The
  webhook handler's only job is: verify the request is genuinely from
  Vapi (signature/secret check), transcribe, construct a `Signal`, and
  call the existing signal-ingestion path -- never route transcribed text
  into, say, `ApplyDisruption` or plan approval, no matter what the caller
  says on the phone. This is the same untrusted-content rule as
  `docs/SECURITY.md` describes for web content.

## Dependencies

- Existing `Signal`/`Provenance` domain types
- `packages/application/src/use-cases/list-signals.ts` and
  `correlate-signals.ts` as the read/correlate paths for what this
  produces

## Contracts implemented

- New `FieldVoicePort` in `packages/application/src/ports/`:

  ```ts
  interface FieldVoicePort {
    transcribeCall(callId: string): Promise<{ transcript: string; callerIdentifier: string }>;
  }
  ```

- The webhook route should call a new application use case (e.g.
  `IngestFieldVoiceSignal`) built on the standard execution pipeline
  (`packages/application/src/execution/pipeline.ts`), not bespoke logic in
  the route handler.

## Acceptance criteria

- Webhook signature verification rejects unsigned/forged requests before
  any transcription or state mutation happens.
- A successfully ingested call produces exactly one `Signal` with
  `sourceType` identifying it as a phone-originated report and
  `trustLevel: "UNTRUSTED"`.
- With no Vapi credentials configured, the webhook route either doesn't
  register or returns a clear 501/404 -- it must not crash `apps/api` on
  startup.

## Tests

- Unit tests with a mocked Vapi webhook payload and signature.
- A test that a malformed/unsigned webhook payload is rejected (400/401)
  without creating a Signal.

## Non-goals

- Building outbound calling (Vapi placing calls to field units) -- this
  task is inbound-only (field unit calls in). Outbound is a separate,
  future task if needed.
