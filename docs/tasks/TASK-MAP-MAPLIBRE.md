# TASK-MAP-MAPLIBRE

## Objective

Replace `apps/web/src/components/MapPlaceholder.tsx` with a real MapLibre
GL JS map rendering the earthquake-alpha graph: nodes as markers,
road segments as lines colored by status (OPEN/DEGRADED/BLOCKED),
incidents/resources/hazards as layered markers, and the currently focused
entity (`store.focusEntityId`) highlighted/panned-to.

## Allowed areas/files

- `apps/web/src/components/MapPlaceholder.tsx` (rename to `Map.tsx` if you
  like, update the import in `apps/web/src/App.tsx`)
- `apps/web/package.json` (add `maplibre-gl` and `react-map-gl` or a
  thin custom wrapper)
- New files under `apps/web/src/map/`

## Explicitly out of bounds

- `packages/domain/src/entities/facility.ts`'s `GraphNode`/`RoadSegment`
  shapes are the source of truth for geometry -- do not invent a parallel
  geometry representation. If a field is missing from the API response,
  extend `apps/api/src/app.ts`'s `/api/scenarios/:id/picture` (or add a
  new read-only `/api/scenarios/:id/graph` endpoint) rather than
  hardcoding coordinates in the frontend.

## Dependencies

- earthquake-alpha's actual coordinates: `scenarios/earthquake-alpha/src/
  grid.ts` (5x5 grid, `ORIGIN = {lat: 37.77, lon: -122.44}`,
  `CELL_DEGREES = 0.006`) -- these are synthetic but real numbers, usable
  directly as GeoJSON.
- `GET /api/scenarios/:id/picture` currently returns `snapshot.incidents`
  and `snapshot.resources` as `[id, entity][]` pairs (Maps are serialized
  to entry arrays by `apps/api/src/http-result.ts`'s `toJsonSafe`). Road
  segments and graph nodes are NOT currently in the picture payload -- add
  them (or a dedicated endpoint) as part of this task.

## Contracts implemented

None new -- if you add a `/api/scenarios/:id/graph` endpoint, it should
follow the same `AgentToolResult` envelope as every other route
(`toHttpResponse`/`toJsonSafe` in `apps/api/src/http-result.ts`).

## Acceptance criteria

- Blocked and degraded roads (`bridge-17` / `ROAD-H-2-2`, `ROAD-V-1-1`) are
  visually distinguishable from open roads.
- Clicking a node/marker calls `store.setFocusEntity(id)`.
- Falls back gracefully (does not crash) if map tiles fail to load
  (offline dev, no tile server configured) -- a blank basemap with the
  vector overlay still showing is acceptable.
- `pnpm --filter @zero/web build` passes.

## Tests

- Manual verification via the `run` skill / dev server is sufficient for
  Phase 02; add automated visual/interaction tests only if the project
  adopts a component testing tool.

## Non-goals

- No live tile-server billing/API-key setup beyond documenting which
  provider (e.g. MapLibre demo tiles, or a free-tier provider) is used and
  where the key/config lives.
