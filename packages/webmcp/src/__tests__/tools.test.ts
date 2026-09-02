import { describe, expect, it, vi } from "vitest";
import { WebMcpHttpClient } from "../http-client.js";
import {
  ALL_TOOLS,
  correlateSignalsTool,
  getOperationalPictureTool,
  simulateResponsePlanTool,
  stageResponsePlanTool,
} from "../tools.js";
import { MockWebMcpProvider } from "../provider.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("WebMCP tools: schema validation", () => {
  it("rejects a call missing required fields without hitting the network", async () => {
    const fetchImpl = vi.fn();
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    const result = await getOperationalPictureTool.execute({}, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects correlate_signals with fewer than two signal ids", async () => {
    const fetchImpl = vi.fn();
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    const result = await correlateSignalsTool.execute(
      { scenarioId: "earthquake-alpha", signalIds: ["only-one"], operationId: "op-1" },
      client,
    );

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("WebMCP tools: tool-to-use-case mapping", () => {
  it("get_operational_picture calls GET /api/scenarios/:id/picture", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, world: {}, data: {}, warnings: [], evidence: [], effects: [] }));
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    await getOperationalPictureTool.execute({ scenarioId: "earthquake-alpha" }, client);

    expect(fetchImpl).toHaveBeenCalledWith("http://api.test/api/scenarios/earthquake-alpha/picture", expect.objectContaining({ method: "GET" }));
  });

  it("simulate_response_plan (GenerateResponsePlans) POSTs to /plans/simulate with the parsed body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, world: {}, data: [], warnings: [], evidence: [], effects: [] }));
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    await simulateResponsePlanTool.execute({ scenarioId: "earthquake-alpha", basisWorldVersion: 1 }, client);

    const [url, options] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/scenarios/earthquake-alpha/plans/simulate");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ scenarioId: "earthquake-alpha", basisWorldVersion: 1 });
  });

  it("stage_response_plan (StageResponsePlan) POSTs to /plans/:planId/stage", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, world: {}, data: {}, warnings: [], evidence: [], effects: [] }));
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    await stageResponsePlanTool.execute({ scenarioId: "earthquake-alpha", planId: "plan-1", operationId: "op-1" }, client);

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/scenarios/earthquake-alpha/plans/plan-1/stage",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("WebMCP tools: machine-readable errors", () => {
  it("propagates the API's structured AgentToolFailure unchanged", async () => {
    const failure = {
      ok: false,
      world: { scenarioId: "earthquake-alpha", version: 1, timestamp: "2026-01-15T08:00:00.000Z" },
      error: { code: "STALE_WORLD", message: "stale", recoverable: true, recommendedAction: "REPLAN" },
      warnings: [],
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(failure, 409));
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test", fetchImpl });

    const result = await simulateResponsePlanTool.execute({ scenarioId: "earthquake-alpha", basisWorldVersion: 1 }, client);

    expect(result).toEqual(failure);
  });
});

describe("WebMCP tools: no approval capability exposed", () => {
  it("registers exactly the 10 specified tools", () => {
    expect(ALL_TOOLS.map((tool) => tool.name).sort()).toEqual(
      [
        "compare_response_plans",
        "correlate_signals",
        "focus_operator_view",
        "get_operational_picture",
        "inspect_entity",
        "list_unverified_signals",
        "query_operational_graph",
        "run_what_if",
        "simulate_response_plan",
        "stage_response_plan",
      ].sort(),
    );
  });

  it("never exposes approve_response_plan, reject_response_plan, apply_disruption or verify_operation", () => {
    const names = ALL_TOOLS.map((tool) => tool.name);
    for (const forbidden of ["approve_response_plan", "reject_response_plan", "apply_disruption", "verify_operation"]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("the mock provider registry also never contains an approval tool", () => {
    const provider = new MockWebMcpProvider();
    const client = new WebMcpHttpClient({ baseUrl: "http://api.test" });
    provider.registerAll(ALL_TOOLS, client);
    expect(provider.listRegisteredToolNames()).not.toContain("approve_response_plan");
    expect(provider.listRegisteredToolNames()).toHaveLength(10);
  });
});
