import { describe, expect, it } from "vitest";
import {
  applyDisruption,
  approveResponsePlan,
  generateResponsePlans,
  rejectResponsePlan,
  stageResponsePlan,
} from "@zero/application";
import { buildComposition, type AppComposition } from "../composition.js";

const HUMAN = { actor: "operator-1", actorKind: "HUMAN" as const };
const AGENT = { actor: "browser-agent", actorKind: "AGENT" as const };

async function generateFastestPlan(app: AppComposition) {
  const result = await generateResponsePlans(
    { scenarioId: "earthquake-alpha", basisWorldVersion: 1, strategies: ["FASTEST"] },
    app.ctx,
    AGENT,
    app.planner,
  );
  if (!result.ok) throw new Error(`setup failed: ${result.error.message}`);
  return result.data[0]!;
}

/**
 * These exercise the same @zero/application use cases the WebMCP and HTTP
 * adapters call, wired to real in-memory infrastructure and the real
 * earthquake-alpha scenario -- the "application" test category from
 * section 26, hosted here (rather than inside @zero/application itself) so
 * that package stays free of any concrete-adapter dependency, even in
 * tests. See docs/architecture/OVERVIEW.md.
 */
describe("application use cases (integration)", () => {
  it("generates plans against the current world version", async () => {
    const app = buildComposition();
    const result = await generateResponsePlans(
      { scenarioId: "earthquake-alpha", basisWorldVersion: 1 },
      app.ctx,
      AGENT,
      app.planner,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(3);
      for (const plan of result.data) {
        expect(plan.status).toBe("SIMULATED");
        expect(plan.basisWorldVersion).toBe(1);
      }
    }
  });

  it("stages a plan through VALIDATED -> STAGED -> AWAITING_APPROVAL", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);

    const result = await stageResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-stage-1" },
      app.ctx,
      HUMAN,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("AWAITING_APPROVAL");
    }
  });

  it("rejects staging a plan whose basisWorldVersion is stale", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);

    const disruption = await applyDisruption(
      {
        scenarioId: "earthquake-alpha",
        mutation: { kind: "BLOCK_ROAD", roadSegmentId: "ROAD-H-0-0" },
        operationId: "op-disrupt-1",
      },
      app.ctx,
      HUMAN,
    );
    expect(disruption.ok).toBe(true);

    const result = await stageResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-stage-stale" },
      app.ctx,
      HUMAN,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STALE_WORLD");
      expect(result.error.recoverable).toBe(true);
      expect(result.error.recommendedAction).toBe("REPLAN");
    }
  });

  it("approves a staged plan as a human caller, starting an Operation", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);
    await stageResponsePlan({ scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-stage-2" }, app.ctx, HUMAN);

    const result = await approveResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, actor: "chief-1", operationId: "op-approve-1" },
      app.ctx,
      HUMAN,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.plan.status).toBe("EXECUTING");
      expect(result.data.operation.status).toBe("STARTED");
    }
  });

  it("SECURITY: refuses to approve a plan when the caller is an agent", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);
    await stageResponsePlan({ scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-stage-3" }, app.ctx, HUMAN);

    const result = await approveResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, actor: "browser-agent", operationId: "op-approve-agent" },
      app.ctx,
      AGENT,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED_ACTION");
    }
  });

  it("rejects a staged plan as a human caller", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);
    await stageResponsePlan({ scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-stage-4" }, app.ctx, HUMAN);

    const result = await rejectResponsePlan(
      {
        scenarioId: "earthquake-alpha",
        planId: plan.id,
        actor: "chief-1",
        reason: "insufficient reserve coverage",
        operationId: "op-reject-1",
      },
      app.ctx,
      HUMAN,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("REJECTED");
    }
  });

  it("IDEMPOTENCY: replaying the same operationId does not re-execute the mutation", async () => {
    const app = buildComposition();
    const plan = await generateFastestPlan(app);

    const first = await stageResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-idempotent-1" },
      app.ctx,
      HUMAN,
    );
    const second = await stageResponsePlan(
      { scenarioId: "earthquake-alpha", planId: plan.id, operationId: "op-idempotent-1" },
      app.ctx,
      HUMAN,
    );

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);

    const audit = await app.ctx.auditRepository.list("earthquake-alpha" as never);
    const stageEntries = audit.filter((entry) => entry.action === "StageResponsePlan");
    expect(stageEntries).toHaveLength(1);
  });
});
