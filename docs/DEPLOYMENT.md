# Deployment (Target Architecture)

Phase 01 does not deploy anything -- this documents the target so Phase 02
can wire it up without redesigning the app.

## Frontend: Vercel

- Project root: `apps/web`
- Build command: `pnpm --filter @zero/web build`
- Output directory: `apps/web/dist`
- Environment variable: `VITE_API_BASE_URL` -> the Render API's public URL
- No server-side rendering; it's a static Vite build calling the API over
  HTTPS/fetch and (later) WebSocket.

## Backend: Render Node.js Web Service

- Project root: `apps/api`
- Build command: `pnpm --filter @zero/api build`
- Start command: `pnpm --filter @zero/api start` (runs `node dist/server.js`)
- `PORT` is read from `process.env.PORT` (`apps/api/src/server.ts`) --
  Render sets this automatically.
- Environment variable (Phase 02, once Postgres is wired):
  `DATABASE_URL` -> the Render PostgreSQL connection string.

No Cloudflare Workers, Durable Objects, or D1 -- the architecture is
deliberately infrastructure-independent (plain Node + Hono), so it is not
tied to Render specifically beyond "a long-running Node process."

## Database: PostgreSQL (+ PostGIS-ready)

`packages/persistence/src/postgres/` has the Drizzle schema prepared (see
`docs/tasks/TASK-POSTGRES-PERSISTENCE.md` for the remaining wiring work).
When provisioning:

1. Create a Render PostgreSQL instance (or any standard Postgres 15+).
2. Enable the `postgis` extension if/when migrating location columns from
   `lat`/`lon` doubles to `geography(Point, 4326)`.
3. Set `DATABASE_URL` on the Render Web Service.
4. `pnpm --filter @zero/persistence db:generate` then `db:migrate`
   (drizzle-kit) to create the schema.

## Realtime (Phase 02)

`apps/api/src/realtime/scenario-room.ts`'s `ScenarioRoom` is an in-process
pub/sub abstraction with no transport attached yet. Render supports
long-lived WebSocket connections on a Node Web Service; the plan is a
`GET /ws/scenarios/:id` route that subscribes a socket to a `ScenarioRoom`
and forwards `RoomMessage`s -- see `docs/tasks/TASK-RENDER-REALTIME.md`.
No code in `apps/api`'s route handlers or in `@zero/application` needs to
change for this.

## What is explicitly not part of this deployment target

Cloudflare Workers/Durable Objects/D1, authentication providers, Tavily,
Apify, Vapi, ElevenLabs, and n8n are all out of scope for Phase 01 and are
not assumed by anything in `apps/api` or `apps/web` today.
