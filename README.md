# ZERO — Agent-Native Multi-Hazard Crisis Operations Digital Twin

Human operators and a browser AI agent (via WebMCP) interact with the same
authoritative operational world. The agent investigates, correlates,
simulates, and proposes; humans approve.

Phase 01 status: domain, application, routing, planner, what-if
simulation, the earthquake-alpha demo scenario, the Hono API, the WebMCP
tool adapter, and a minimal React Command Center are all implemented and
tested. See `docs/architecture/OVERVIEW.md` for the full picture.

## Quick start

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Run the app locally:

```bash
cd apps/api && pnpm dev   # http://localhost:8787
cd apps/web && pnpm dev   # http://localhost:5173
```

## Documentation

- [`docs/architecture/OVERVIEW.md`](docs/architecture/OVERVIEW.md) — architecture and package map
- [`docs/WEBMCP.md`](docs/WEBMCP.md) — the agent tool surface
- [`docs/SECURITY.md`](docs/SECURITY.md) — the human-approval boundary
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — day-to-day commands
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel + Render + Postgres target
- [`docs/ADR/`](docs/ADR/) — architecture decision records
- [`docs/tasks/`](docs/tasks/) — scoped specs for parallel follow-on work
- [`evals/`](evals/) — deterministic agent-journey definitions
