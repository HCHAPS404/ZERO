import type { OperationalSnapshot, PlanMetrics, ResponsePlan } from "@zero/domain";
import type { WhatIfMutation } from "@zero/contracts";

export interface SimulationKpis {
  readonly averageEtaSeconds: number;
  readonly criticalEtaSeconds: number;
  readonly riskExposure: number;
  readonly unreachableIncidentCount: number;
}

export interface WhatIfSimulationResult {
  readonly baselineWorldVersion: number;
  readonly baselineMetrics: SimulationKpis;
  readonly simulatedMetrics: SimulationKpis;
  readonly affectedEntityIds: readonly string[];
  readonly invalidatedPlanIds: readonly string[];
  readonly candidateReplacementPlans: readonly ResponsePlan[];
}

/**
 * WhatIfSimulationPort operates entirely on cloned snapshots. It must never
 * be given a way to write back to the authoritative OperationalWorld -- the
 * in-memory adapter enforces this by only ever accepting/returning
 * OperationalSnapshot values, never OperationalWorld references held by a
 * repository.
 */
export interface WhatIfSimulationPort {
  runWhatIf(
    snapshot: OperationalSnapshot,
    existingPlans: readonly ResponsePlan[],
    mutations: readonly WhatIfMutation[],
  ): WhatIfSimulationResult;
}

export type { PlanMetrics };
