# TASK-POSTGRES-PERSISTENCE

## Objective

Implement `PostgresScenarioRepository`, `PostgresAuditRepository`,
`PostgresEventRepository`, and `PostgresIdempotencyRepository` against the
Drizzle schema already defined in `packages/persistence/src/postgres/
schema.ts`, satisfying the exact same application ports the in-memory
adapters satisfy, and wire an opt-in switch in `apps/api/src/
composition.ts` to use them when `DATABASE_URL` is set.

## Allowed areas/files

- `packages/persistence/src/postgres/**` (new repository files)
- `packages/persistence/src/index.ts` (export the new classes)
- `apps/api/src/composition.ts` (branch on `process.env.DATABASE_URL`)
- `packages/persistence/drizzle.config.ts` / `drizzle/` migration output

## Explicitly out of bounds

- `packages/application/src/ports/*.ts` -- the port interfaces
  (`ScenarioRepository`, `AuditRepository`, `EventRepository`,
  `IdempotencyRepository`) are the contract; if you find you need to
  change one, that's a separate, explicitly-flagged architectural
  decision, not a side effect of this task.
- `packages/domain/**` -- do not leak Drizzle types into domain entities.
  Map database rows to domain types inside the repository, using each
  row's `payload: jsonb` column as the primary source (see
  `docs/ADR/0006-postgresql-postgis-persistence-strategy.md` for why the
  schema is shaped this way).

## Dependencies

- `packages/persistence/src/postgres/schema.ts` (all 13 tables)
- `packages/persistence/src/postgres/client.ts`'s `createPostgresClient`
- `packages/persistence/src/in-memory/*.ts` as the reference behavior each
  Postgres adapter must match (same port, same semantics)

## Contracts implemented

- `ScenarioRepository`, `AuditRepository`, `EventRepository`,
  `IdempotencyRepository` (`packages/application/src/ports/`)

## Acceptance criteria

- Every method on every port has a Postgres-backed implementation with the
  same behavior as its in-memory counterpart (in particular: `saveWorld`
  must be transactional across the entity tables it touches, since a
  world mutation can add/update multiple entities at once).
- `apps/api/src/composition.ts` uses the Postgres adapters automatically
  when `DATABASE_URL` is set, and falls back to in-memory otherwise --
  Phase 01's zero-dependency `pnpm test` behavior must not regress.
- `pnpm --filter @zero/persistence db:generate` produces a migration that
  applies cleanly to a fresh Postgres 15+ database.

## Tests

- Integration tests gated behind `DATABASE_URL` being set (skip, don't
  fail, when it's absent) -- e.g. `describe.skipIf(!process.env.DATABASE_URL)`
  in Vitest. Document the local setup (docker-compose or a local Postgres)
  in `docs/DEVELOPMENT.md`.
- Reuse the same test scenarios as `apps/api/src/__tests__/
  application-integration.test.ts` where practical, parameterized over
  both the in-memory and Postgres adapters, so the two stay
  behaviorally identical.

## Non-goals

- Migrating `lat`/`lon` columns to real PostGIS `geography` types (do the
  double-precision version first; PostGIS geometry is a follow-up once an
  actual spatial query is needed).
