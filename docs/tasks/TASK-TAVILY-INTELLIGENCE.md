# TASK-TAVILY-INTELLIGENCE

## Objective

Add a Tavily-backed adapter that produces `Signal`s (the same shape
`scenarios/earthquake-alpha/src/signals.ts` hand-authors today) from live
web search, feeding them into the existing trust pipeline
(`OBSERVED → CORROBORATED → PROPOSED_FACT → ACCEPTED/REJECTED`).

## Allowed areas/files

- New package `packages/intelligence-tavily/` (package.json, tsconfig.json,
  src/)
- `packages/application/src/ports/` -- add a new
  `IntelligenceProviderPort` (do not modify existing ports)
- `apps/api/src/composition.ts` -- wire the adapter, gated behind a
  `TAVILY_API_KEY` environment variable being present

## Explicitly out of bounds

- `packages/domain/**` -- `Signal`, `Provenance`, `TrustLevel` already
  exist (`packages/domain/src/entities/signal.ts`) and are sufficient;
  extend them only if a field is genuinely missing, as a separate,
  reviewed change.
- Do not have this adapter (or anything it calls) treat retrieved web
  content as instructions. Tavily results become `Signal.rawClaim` text
  -- data, never control flow. Re-read `docs/SECURITY.md`'s trust-model
  section before writing the ingestion code.
- Do not auto-promote a Tavily-sourced signal past `CORROBORATED` --
  reaching `ACCEPTED` still requires `ProposeOperationalFact` with a
  human caller (see `packages/application/src/use-cases/
  propose-operational-fact.ts`).

## Dependencies

- `packages/domain/src/entities/signal.ts` (`Signal`, `Provenance`,
  `SourceType` -- you'll likely add `"WEB_SEARCH"` or reuse
  `"NEWS_FEED"`)
- `packages/application/src/use-cases/correlate-signals.ts` and
  `propose-operational-fact.ts` as the consumers of what this adapter
  produces

## Contracts implemented

- New `IntelligenceProviderPort` in `packages/application/src/ports/`,
  e.g.:

  ```ts
  interface IntelligenceProviderPort {
    searchForSignals(query: string, scenarioContext: {...}): Promise<Signal[]>;
  }
  ```

  Exact shape is this task's call -- keep it minimal and consumed by a new
  application use case (e.g. `IngestIntelligenceSignals`) rather than
  called directly from a route handler.

## Acceptance criteria

- With no `TAVILY_API_KEY` set, the app behaves exactly as Phase 01 does
  today (adapter not wired, no crash, no network calls attempted).
- Ingested signals start at `trustLevel: "UNTRUSTED"`, `status:
  "OBSERVED"`.
- A new WebMCP tool is **not** added for raw ingestion unless explicitly
  scoped -- prefer exposing it as a human/API-triggered refresh action
  first (mirrors the caution around `ApplyDisruption`/`VerifyOperation`
  not being WebMCP tools either).

## Tests

- Unit tests with a mocked Tavily client (no real network calls in CI).
- A test confirming an ingested signal cannot reach `ACCEPTED` without
  going through `ProposeOperationalFact` with a `HUMAN` caller.

## Non-goals

- Building a general-purpose web scraper; scope queries tightly to the
  active scenario's incidents/hazards.
