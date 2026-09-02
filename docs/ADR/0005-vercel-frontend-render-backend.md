# ADR 0005: Vercel Frontend + Render Node.js Backend

## Status

Accepted (Phase 01, deployment not yet executed).

## Context

The brief explicitly excludes Cloudflare Workers, Durable Objects, and D1,
and asks for Vercel (frontend) + Render Node.js Web Service (backend) +
PostgreSQL/PostGIS as the deployment targets, with the architecture
staying infrastructure-independent.

## Decision

- `apps/web` is a static Vite build with no server-side rendering,
  suitable for Vercel's static/CDN hosting. It talks to the backend only
  over `fetch` (and, later, WebSocket) using `VITE_API_BASE_URL`.
- `apps/api` is a plain Node.js process running Hono via
  `@hono/node-server`, reading `PORT` from the environment -- exactly what
  a Render Web Service expects, with no Render-specific API calls
  anywhere in the code.
- Nothing in `packages/*` imports a Vercel or Render SDK. The composition
  root (`apps/api/src/composition.ts`) is the only place that would ever
  need to change to target a different Node host.

## Consequences

- Moving the backend to a different Node-hosting provider later is a
  deployment-config change, not a code change.
- Realtime (WebSocket) support is deferred to Phase 02
  (`docs/tasks/TASK-RENDER-REALTIME.md`) since Render's WebSocket support
  on a long-running Node service is a natural fit for the already-defined
  `ScenarioRoom` abstraction (`apps/api/src/realtime/scenario-room.ts`).
- No deployment has actually been executed as part of Phase 01 -- this ADR
  records the target, not a completed migration. See
  `docs/DEPLOYMENT.md` for the concrete steps.
