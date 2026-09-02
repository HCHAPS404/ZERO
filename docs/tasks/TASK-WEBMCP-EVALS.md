# TASK-WEBMCP-EVALS

## Objective

Turn the deterministic journey definitions in `evals/journeys/*.json` into
an executable eval runner, and finish the zod→JSON-Schema conversion for
`BrowserWebMcpProvider`'s tool registration (currently a placeholder --
see `packages/webmcp/src/provider.ts`).

## Allowed areas/files

- `evals/**` (new runner code, e.g. `evals/src/run.ts`)
- `packages/webmcp/src/provider.ts` (the `inputSchema: { type: "object" }`
  placeholder in `BrowserWebMcpProvider.registerTool`)
- `packages/webmcp/package.json` (add a zod-to-JSON-Schema dependency,
  e.g. `zod-to-json-schema`)

## Explicitly out of bounds

- Do not change `packages/webmcp/src/tools.ts`'s `ALL_TOOLS` list or add
  new tools as part of this task -- if a journey needs a tool that doesn't
  exist, that's a separate, explicitly-reviewed change (see
  `docs/SECURITY.md` before touching anything approval-adjacent).
- Do not weaken `packages/webmcp/src/__tests__/tools.test.ts`'s
  "exactly 10 tools, never an approval tool" assertions.

## Dependencies

- `evals/journeys/*.json` (the 7 Phase 01 journeys) and `evals/README.md`
  (the schema they follow)
- `packages/webmcp/src/tools.ts` (`ALL_TOOLS`, each tool's `inputSchema`)
- An LLM/agent harness of your choice to actually drive tool calls against
  a running `apps/api` instance (out of scope to prescribe here)

## Contracts consumed

- `AgentToolResult<T>` (`packages/contracts/src/agent-tool-result.ts`) --
  a conforming runner should assert on `ok`, `error.code`,
  `error.recoverable`, `error.recommendedAction`, not just HTTP status.

## Acceptance criteria

- A `pnpm --filter evals run <journey-id>` (or equivalent) command
  executes a journey against a running `apps/api` + an agent/LLM driver
  and reports pass/fail per `successCondition`.
- `forbiddenTools` violations (the agent attempting to call
  `approve_response_plan` etc., which doesn't exist) are detected and
  reported as a hard failure, not silently ignored.
- `BrowserWebMcpProvider.registerTool` sends a real JSON Schema derived
  from each tool's zod `inputSchema`.

## Tests

- Add unit tests for the zod→JSON-Schema conversion
  (`packages/webmcp/src/__tests__/`).
- Journey-runner tests can use `MockWebMcpProvider`
  (`packages/webmcp/src/provider.ts`) to simulate tool calls without a
  real LLM in CI.

## Non-goals

- Building a full probabilistic/statistical eval scoring system (the
  brief explicitly defers this).
