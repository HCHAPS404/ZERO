import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { buildComposition } from "../composition.js";

describe("Hono API", () => {
  it("GET /health reports ok", async () => {
    const app = buildApp(buildComposition());
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /api/scenarios/:id/picture returns the operational picture", async () => {
    const app = buildApp(buildComposition());
    const res = await app.request("/api/scenarios/earthquake-alpha/picture");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.incidentCount).toBe(4);
    expect(body.world.scenarioId).toBe("earthquake-alpha");
  });

  it("POST /api/scenarios/:id/plans/simulate generates plans", async () => {
    const app = buildApp(buildComposition());
    const res = await app.request("/api/scenarios/earthquake-alpha/plans/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ basisWorldVersion: 1, strategies: ["FASTEST"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].strategy).toBe("FASTEST");
  });

  it("POST .../plans/simulate with a stale basisWorldVersion returns 409 STALE_WORLD", async () => {
    const app = buildApp(buildComposition());
    const res = await app.request("/api/scenarios/earthquake-alpha/plans/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ basisWorldVersion: 999 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("STALE_WORLD");
  });

  it("full human approval flow: simulate -> stage -> approve", async () => {
    const app = buildApp(buildComposition());

    const simulate = await app.request("/api/scenarios/earthquake-alpha/plans/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ basisWorldVersion: 1, strategies: ["FASTEST"] }),
    });
    const { data: plans } = await simulate.json();
    const planId = plans[0].id;

    const stage = await app.request(`/api/scenarios/earthquake-alpha/plans/${planId}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: "op-stage-http-1" }),
    });
    expect(stage.status).toBe(200);
    const staged = await stage.json();
    expect(staged.data.status).toBe("AWAITING_APPROVAL");

    const approve = await app.request(`/api/scenarios/earthquake-alpha/plans/${planId}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: "chief-1", operationId: "op-approve-http-1" }),
    });
    expect(approve.status).toBe(200);
    const approved = await approve.json();
    expect(approved.data.plan.status).toBe("EXECUTING");
  });
});
