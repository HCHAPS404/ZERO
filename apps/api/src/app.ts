import { Hono } from "hono";
import { cors } from "hono/cors";
import { asScenarioId } from "@zero/domain";
import type { AgentToolResultWorld } from "@zero/contracts";
import type { CallerContext, UseCaseContext } from "@zero/application";
import {
  applyDisruption,
  approveResponsePlan,
  compareResponsePlans,
  correlateSignals,
  focusOperatorView,
  generateResponsePlans,
  getOperationalPicture,
  inspectEntity,
  listSignals,
  proposeOperationalFact,
  queryOperationalGraph,
  rejectResponsePlan,
  runWhatIfSimulation,
  stageResponsePlan,
  verifyOperation,
} from "@zero/application";
import type { AppComposition } from "./composition.js";
import { toHttpResponse, toJsonSafe } from "./http-result.js";

/**
 * Every route below does exactly three things: extract a CallerContext,
 * call one application use case, and translate the UseCaseResult to HTTP.
 * No business logic lives here -- that all lives in @zero/application.
 */
export function buildApp(app: AppComposition) {
  const hono = new Hono();
  hono.use("*", cors());

  async function worldInfo(scenarioId: string): Promise<AgentToolResultWorld> {
    const world = await app.ctx.scenarioRepository.getWorld(asScenarioId(scenarioId));
    return { scenarioId, version: world.version, timestamp: app.ctx.clock.now() };
  }

  function callerFromRequest(body: unknown): CallerContext {
    const actor =
      body && typeof body === "object" && "actor" in body && typeof (body as { actor?: unknown }).actor === "string"
        ? (body as { actor: string }).actor
        : "operator";
    return { actor, actorKind: "HUMAN" };
  }

  hono.get("/health", (c) => c.json({ status: "ok", service: "zero-api", timestamp: new Date().toISOString() }));

  hono.get("/api/scenarios/:id/picture", async (c) => {
    const scenarioId = c.req.param("id");
    const result = await getOperationalPicture({ scenarioId }, app.ctx, { actor: "ui", actorKind: "HUMAN" });
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.get("/api/scenarios/:id/entities/:type/:entityId", async (c) => {
    const scenarioId = c.req.param("id");
    const result = await inspectEntity(
      { scenarioId, entityType: c.req.param("type"), entityId: c.req.param("entityId") },
      app.ctx,
      { actor: "ui", actorKind: "HUMAN" },
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.get("/api/scenarios/:id/graph/route", async (c) => {
    const scenarioId = c.req.param("id");
    const result = await queryOperationalGraph(
      { scenarioId, fromGraphNodeId: c.req.query("from") ?? "", toGraphNodeId: c.req.query("to") ?? "" },
      app.ctx,
      { actor: "ui", actorKind: "HUMAN" },
      app.routingEngine,
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.get("/api/scenarios/:id/signals", async (c) => {
    const scenarioId = c.req.param("id");
    const status = c.req.query("status");
    const result = await listSignals(
      { scenarioId, ...(status ? { status: status as never } : {}) },
      app.ctx,
      { actor: "ui", actorKind: "HUMAN" },
    );
    const { status: httpStatus, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, httpStatus as never);
  });

  hono.post("/api/scenarios/:id/signals/correlate", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await correlateSignals({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload));
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/facts/propose", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await proposeOperationalFact({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload));
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.get("/api/scenarios/:id/plans", async (c) => {
    const scenarioId = c.req.param("id");
    const plans = await app.scenarioRepository.listPlans(asScenarioId(scenarioId));
    return c.json(toJsonSafe({ ok: true, world: await worldInfo(scenarioId), data: plans, warnings: [], evidence: [], effects: [] }));
  });

  // Read-only: powers the Agent Activity Timeline in the Command Center.
  hono.get("/api/scenarios/:id/audit", async (c) => {
    const scenarioId = c.req.param("id");
    const entries = await app.ctx.auditRepository.list(asScenarioId(scenarioId));
    return c.json(toJsonSafe({ ok: true, world: await worldInfo(scenarioId), data: entries, warnings: [], evidence: [], effects: [] }));
  });

  hono.post("/api/scenarios/:id/plans/simulate", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await generateResponsePlans({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload), app.planner);
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/plans/compare", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await compareResponsePlans({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload));
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/simulations/what-if", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await runWhatIfSimulation({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload), app.simulation);
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/plans/:planId/stage", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await stageResponsePlan(
      { scenarioId, planId: c.req.param("planId"), ...payload },
      app.ctx,
      callerFromRequest(payload),
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  // SECURITY BOUNDARY: approve/reject are only reachable from this
  // human-facing API surface. They are never registered as WebMCP tools.
  hono.post("/api/scenarios/:id/plans/:planId/approve", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await approveResponsePlan(
      { scenarioId, planId: c.req.param("planId"), ...payload },
      app.ctx,
      callerFromRequest(payload),
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    if (result.ok) {
      app.scenarioRoom.publish({
        type: "ResponsePlanApproved",
        scenarioId,
        payload: { planId: result.data.plan.id },
        occurredAt: app.ctx.clock.now(),
      });
    }
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/plans/:planId/reject", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await rejectResponsePlan(
      { scenarioId, planId: c.req.param("planId"), ...payload },
      app.ctx,
      callerFromRequest(payload),
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/disruptions", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await applyDisruption({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload));
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    if (result.ok) {
      app.scenarioRoom.publish({
        type: "WorldMutated",
        scenarioId,
        payload: { invalidatedPlanIds: result.data.invalidatedPlanIds },
        occurredAt: app.ctx.clock.now(),
      });
    }
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/operations/:operationId/verify", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await verifyOperation(
      { scenarioId, targetOperationId: c.req.param("operationId"), ...payload },
      app.ctx,
      callerFromRequest(payload),
    );
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  hono.post("/api/scenarios/:id/focus", async (c) => {
    const scenarioId = c.req.param("id");
    const payload = await c.req.json();
    const result = await focusOperatorView({ scenarioId, ...payload }, app.ctx, callerFromRequest(payload));
    if (result.ok) {
      app.scenarioRoom.publish({
        type: "FocusOperatorView",
        scenarioId,
        payload: result.data,
        occurredAt: app.ctx.clock.now(),
      });
    }
    const { status, body } = toHttpResponse(result, await worldInfo(scenarioId));
    return c.json(body, status as never);
  });

  return hono;
}
