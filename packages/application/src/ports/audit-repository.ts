import type { AuditEntry, ScenarioId } from "@zero/domain";

export interface AuditRepository {
  append(scenarioId: ScenarioId, entry: AuditEntry): Promise<void>;
  list(scenarioId: ScenarioId): Promise<readonly AuditEntry[]>;
}
