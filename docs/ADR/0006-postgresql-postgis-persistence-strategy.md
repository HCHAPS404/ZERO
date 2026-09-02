# ADR 0006: PostgreSQL/PostGIS Persistence Strategy

## Status

Accepted (Phase 01: schema prepared, not required by any test; adapter
wiring deferred).

## Context

Phase 01 explicitly must not require PostgreSQL for `pnpm install`,
`pnpm typecheck`, `pnpm test`, or `pnpm build` to succeed -- every port
(`ScenarioRepository`, `AuditRepository`, `EventRepository`,
`IdempotencyRepository`) has a working in-memory adapter
(`packages/persistence/src/in-memory/`) used by `apps/api`'s composition
root today. At the same time, the brief requires PostgreSQL/PostGIS to be
the prepared persistent-storage target, not an afterthought.

## Decision

Define the full Drizzle schema now (`packages/persistence/src/postgres/
schema.ts`) covering every entity called out in the brief: scenarios,
incidents, resources, facilities, infrastructure, road segments, graph
nodes, hazards, signals, intel artifacts, response plans, operations,
domain events, audit entries, and idempotency keys. Each table keeps a
`payload: jsonb` column holding the full domain-shaped entity alongside a
handful of promoted columns (id, scenario_id, status, kind, lat/lon, ...)
used for indexing and querying, rather than hand-mapping every domain
field to its own column. Location fields are `lat`/`lon` double-precision
columns today; the `payload` jsonb already stores the same `{lat, lon}`
shape the domain layer uses, so migrating a column to a PostGIS
`geography(Point, 4326)` type later does not require a domain-layer
change.

A concrete `PostgresScenarioRepository` implementing the application ports
against this schema is **not** built in Phase 01 -- see
`docs/tasks/TASK-POSTGRES-PERSISTENCE.md`.

## Consequences

- `pnpm test` never needs a database; CI stays simple.
- The jsonb-plus-promoted-columns shape trades some query ergonomics
  (you can't `WHERE incidents.severity = 'CRITICAL'` without also having
  promoted that column, which we did for the fields likely to be filtered
  on) for a much smaller, less brittle mapping layer between domain types
  and rows -- appropriate for a backbone that will keep evolving the
  domain model.
- The `drizzle-kit` config (`packages/persistence/drizzle.config.ts`)
  and `db:generate`/`db:migrate` scripts exist and are usable against any
  Postgres 15+ instance today, ahead of the adapter itself being wired in.
