import { describe, expect, it } from "vitest";
import {
  asResponsePlanId,
  canTransitionPlan,
  transitionPlan,
  type ResponsePlan,
} from "../index.js";
import { InvalidStateTransitionError } from "../errors.js";

function makePlan(
  status: ResponsePlan["status"],
  constraintViolations: ResponsePlan["constraintViolations"] = [],
): ResponsePlan {
  return {
    id: asResponsePlanId("plan-1"),
    scenarioId: "earthquake-alpha",
    strategy: "BALANCED",
    status,
    basisWorldVersion: 1,
    assignments: [],
    score: 0.5,
    metrics: {
      averageEtaSeconds: 300,
      criticalEtaSeconds: 600,
      resourceUtilization: 0.5,
      remainingReserveCoverage: 1,
      riskExposure: 0.1,
    },
    constraintViolations,
    explanationComponents: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("ResponsePlan state machine", () => {
  it("follows the full happy-path lifecycle", () => {
    let plan = makePlan("DRAFT");
    plan = transitionPlan(plan, "SIMULATED", "t1");
    plan = transitionPlan(plan, "VALIDATED", "t2");
    plan = transitionPlan(plan, "STAGED", "t3");
    plan = transitionPlan(plan, "AWAITING_APPROVAL", "t4");
    plan = transitionPlan(plan, "APPROVED", "t5");
    plan = transitionPlan(plan, "EXECUTING", "t6");
    plan = transitionPlan(plan, "COMPLETED", "t7");
    expect(plan.status).toBe("COMPLETED");
  });

  it("rejects skipping states", () => {
    const plan = makePlan("DRAFT");
    expect(() => transitionPlan(plan, "STAGED", "t1")).toThrow(InvalidStateTransitionError);
  });

  it("allows AWAITING_APPROVAL -> REJECTED", () => {
    expect(canTransitionPlan("AWAITING_APPROVAL", "REJECTED")).toBe(true);
  });

  it("terminal states have no outgoing transitions", () => {
    for (const terminal of ["COMPLETED", "REJECTED", "INVALIDATED", "FAILED"] as const) {
      expect(canTransitionPlan(terminal, "DRAFT")).toBe(false);
    }
  });

  it("refuses to VALIDATE a plan with unresolved hard constraint violations", () => {
    const plan = makePlan("SIMULATED", [
      { constraintId: "constraint-1" as never, description: "district reserve breached" },
    ]);
    expect(() => transitionPlan(plan, "VALIDATED", "t1")).toThrow(InvalidStateTransitionError);
  });
});
