import type {
  ConstraintViolation,
  DistrictReserveConstraint,
  Incident,
  PlanAssignment,
  PlanMetrics,
} from "@zero/domain";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function computeMetrics(
  assignments: readonly PlanAssignment[],
  incidents: readonly Incident[],
  totalResourceCount: number,
  districtCounts: ReadonlyMap<string, number>,
  reserves: readonly DistrictReserveConstraint[],
): PlanMetrics {
  const etas = assignments.map((a) => a.routeSummary.etaSeconds);
  const criticalIncidentIds = new Set(
    incidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").map((i) => i.id),
  );
  const criticalEtas = assignments
    .filter((a) => criticalIncidentIds.has(a.incidentId))
    .map((a) => a.routeSummary.etaSeconds);

  const averageEtaSeconds = etas.length ? etas.reduce((s, v) => s + v, 0) / etas.length : 0;
  const criticalEtaSeconds = criticalEtas.length ? Math.max(...criticalEtas) : (etas.length ? Math.max(...etas) : 0);
  const resourceUtilization = totalResourceCount > 0 ? assignments.length / totalResourceCount : 0;
  const riskExposure = assignments.length
    ? assignments.reduce((s, a) => s + a.routeSummary.hazardExposure, 0) / assignments.length
    : 0;

  const remainingReserveCoverage = reserves.length
    ? reserves.reduce((min, reserve) => {
        const current = districtCounts.get(`${reserve.districtId}:${reserve.resourceKind}`) ?? 0;
        const coverage = reserve.minimumAvailable > 0 ? current / reserve.minimumAvailable : 1;
        return Math.min(min, clamp01(coverage));
      }, 1)
    : 1;

  return {
    averageEtaSeconds,
    criticalEtaSeconds,
    resourceUtilization,
    remainingReserveCoverage,
    riskExposure,
  };
}

export function computeScore(metrics: PlanMetrics, violations: readonly ConstraintViolation[]): number {
  const etaComponent = clamp01(1 - metrics.averageEtaSeconds / 1800) * 0.4;
  const riskComponent = clamp01(1 - metrics.riskExposure / 1000) * 0.3;
  const reserveComponent = metrics.remainingReserveCoverage * 0.2;
  const cleanPlanBonus = violations.length === 0 ? 0.1 : 0;
  return Number((etaComponent + riskComponent + reserveComponent + cleanPlanBonus).toFixed(4));
}
