# WebMCP Adapter

`packages/webmcp` is the browser AI agent's entire capability surface. It
is a thin HTTP client, not a second implementation of the application's
business logic -- every tool calls the exact same `apps/api` route the
React Command Center calls (see `docs/architecture/OVERVIEW.md`).

## The 10 tools

| Tool | Application use case (via the API) | Mutates authoritative world? |
| --- | --- | --- |
| `get_operational_picture` | GetOperationalPicture | no |
| `inspect_entity` | InspectEntity | no |
| `query_operational_graph` | QueryOperationalGraph | no |
| `list_unverified_signals` | ListSignals (filtered) | no |
| `correlate_signals` | CorrelateSignals | yes (signal trust only) |
| `simulate_response_plan` | GenerateResponsePlans | yes (creates plans, not world) |
| `compare_response_plans` | CompareResponsePlans | no |
| `run_what_if` | RunWhatIfSimulation | no (cloned snapshot only) |
| `stage_response_plan` | StageResponsePlan | yes (plan status only) |
| `focus_operator_view` | FocusOperatorView | no |

## What is NOT a WebMCP tool, on purpose

`approve_response_plan`, `reject_response_plan`, `apply_disruption`, and
`verify_operation` are real application use cases (`packages/application`)
reachable through `apps/api`, but they are **absent** from
`packages/webmcp/src/tools.ts`'s `ALL_TOOLS`. This is the primary
enforcement of the human-approval boundary -- see `docs/SECURITY.md`.
`packages/webmcp/src/__tests__/tools.test.ts` asserts the tool count is
exactly 10 and that none of those four names ever appear.

## Registration

`packages/webmcp/src/provider.ts` defines `WebMcpProvider`, the seam
between tool definitions and whatever concrete browser WebMCP API is
available:

- `BrowserWebMcpProvider` calls `navigator.modelContext.registerTool(...)`
  (the emerging imperative WebMCP browser API) if present.
- `MockWebMcpProvider` is an in-memory registry used automatically
  whenever no browser WebMCP global exists (Node, Vitest, SSR, or a
  browser without WebMCP support yet), so builds and tests never depend on
  a real browser.

`createWebMcpProvider()` picks the right one automatically.
`apps/web/src/webmcp-bootstrap.ts` calls `provider.registerAll(ALL_TOOLS,
client)` once on load. Tools can be dynamically registered/unregistered
later (e.g. narrowing the tool set while a specific incident is focused)
by calling `registerTool`/`unregister()` again -- nothing in a tool's
implementation needs to change.

## Input validation and errors

Every tool validates its input with a zod schema (reused from
`@zero/contracts`) before making any network call. A malformed call fails
fast with a structured `AgentToolResult` (`ok: false, error.code:
"INVALID_INPUT"`) -- it never reaches the network, and it never throws a
bare exception. See `docs/architecture/OVERVIEW.md`'s AgentToolResult
section and `packages/contracts/src/agent-tool-result.ts`.

## The upstream WebMCP spec is still evolving

The exact shape of `navigator.modelContext.registerTool` is not yet fixed
upstream. `BrowserWebMcpProvider` isolates that uncertainty to one file
(`packages/webmcp/src/provider.ts`) and currently registers a placeholder
JSON Schema rather than a full zod→JSON-Schema conversion --
`docs/tasks/TASK-WEBMCP-EVALS.md` tracks finishing that once the contract
stabilizes.
