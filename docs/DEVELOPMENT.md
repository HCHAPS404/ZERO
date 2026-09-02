# Development Guide

## Prerequisites

- Node.js >= 20
- pnpm 9.x (`corepack enable` or `npm i -g pnpm`)

No PostgreSQL, no external API keys, and no internet access are required
to install, typecheck, test, or build this repository.

## Install

```bash
pnpm install
```

## Everyday commands (run from the repo root)

```bash
pnpm typecheck   # tsc --noEmit across every package
pnpm test        # vitest run across every package
pnpm build       # tsc build across every package (+ vite build for apps/web)
```

Each of these is `pnpm -r --workspace-concurrency=1 run <script>` under the
hood -- concurrency is set to 1 to keep output readable; drop that flag if
you want parallel execution once the workspace grows.

## Running the app locally

Two processes, in separate terminals:

```bash
# terminal 1 -- API on http://localhost:8787
cd apps/api
pnpm dev

# terminal 2 -- web app on http://localhost:5173
cd apps/web
pnpm dev
```

`apps/web` reads `VITE_API_BASE_URL` (defaults to `http://localhost:8787`)
-- create `apps/web/.env.local` with `VITE_API_BASE_URL=...` to point it
elsewhere.

The app opens directly into the Command Center for the `earthquake-alpha`
scenario (no landing page, no auth in Phase 01).

## Repository layout

See `docs/architecture/OVERVIEW.md` for the full package map and the
dependency-direction rule (`Infrastructure/Adapters/UI → Application →
Domain`). The short version: if you're adding a new capability, ask "is
this a domain rule, an application use case, or an adapter?" before
picking a file.

## Adding a new package

1. `mkdir packages/<name>/src`
2. Copy an existing package's `package.json`/`tsconfig.json` as a
   template (they all extend `tsconfig.base.json` and point `main`/`types`
   at `./src/index.ts` -- workspace packages are consumed as TypeScript
   source directly, no build step required for internal use).
3. Add it to `pnpm-workspace.yaml` if it's outside `packages/*`,
   `apps/*`, or `scenarios/*` (those globs already cover it otherwise).
4. `pnpm install` to link it into the workspace.

## Testing conventions

- Tests live in `src/__tests__/*.test.ts` next to the code they cover.
- `vitest run --passWithNoTests` is the standard `test` script so a
  package that's still mid-refactor (temporarily no tests) doesn't fail CI
  -- but every package that ships logic should have tests before it's
  considered done.
- Packages that need concrete infrastructure adapters to test an
  end-to-end flow (e.g. the full plan-approval lifecycle) put those
  integration tests in `apps/api/src/__tests__/`, not inside
  `packages/application`. That keeps `@zero/application`'s own
  `devDependencies` free of any concrete adapter package, matching the
  hexagonal dependency rule even in test code.

## Git discipline

Commit logical milestones separately with conventional-commit-style
messages (`feat(domain): ...`, `fix(api): ...`, `test: ...`, `chore: ...`).
Run `pnpm typecheck && pnpm test && pnpm build` before committing.
