import { create } from "zustand";
import { apiClient } from "../api/client.js";

export const SCENARIO_ID = "earthquake-alpha";

export interface OperationalPicture {
  readonly incidentCount: number;
  readonly activeIncidentCount: number;
  readonly resourceCount: number;
  readonly availableResourceCount: number;
  readonly blockedRoadCount: number;
  readonly degradedRoadCount: number;
  readonly hazardCount: number;
  readonly unresolvedSignalCount: number;
  readonly snapshot: {
    readonly version: number;
    readonly incidents: [string, Record<string, unknown>][];
    readonly resources: [string, Record<string, unknown>][];
  };
}

export interface PlanSummary {
  readonly id: string;
  readonly strategy: "FASTEST" | "BALANCED" | "LOWEST_RISK";
  readonly status: string;
  readonly basisWorldVersion: number;
  readonly score: number;
  readonly metrics: Record<string, number>;
  readonly constraintViolations: readonly { description: string }[];
  readonly assignments: readonly Record<string, unknown>[];
  readonly explanationComponents: readonly string[];
}

export interface SignalSummary {
  readonly id: string;
  readonly rawClaim: string;
  readonly sourceType: string;
  readonly confidence: number;
  readonly trustLevel: string;
  readonly status: string;
}

export interface AuditEntrySummary {
  readonly id: string;
  readonly actor: string;
  readonly actorKind: "HUMAN" | "AGENT" | "SYSTEM";
  readonly action: string;
  readonly subjectId: string;
  readonly occurredAt: string;
}

interface CommandCenterState {
  worldVersion: number;
  picture?: OperationalPicture | undefined;
  plans: PlanSummary[];
  signals: SignalSummary[];
  auditEntries: AuditEntrySummary[];
  selectedPlanIds: string[];
  comparison?: { plans: PlanSummary[]; recommendedPlanId?: string } | undefined;
  focusEntityId?: string | undefined;
  errorMessage?: string | undefined;
  loading: boolean;

  loadAll(): Promise<void>;
  generatePlans(strategies?: readonly string[]): Promise<void>;
  toggleSelectedPlan(planId: string): void;
  comparePlans(): Promise<void>;
  stagePlan(planId: string): Promise<void>;
  approvePlan(planId: string, actor: string): Promise<void>;
  rejectPlan(planId: string, actor: string, reason: string): Promise<void>;
  correlateSignals(signalIds: readonly string[]): Promise<void>;
  setFocusEntity(entityId: string | undefined): void;
}

let operationCounter = 0;
function nextOperationId(prefix: string): string {
  operationCounter += 1;
  return `${prefix}-${Date.now()}-${operationCounter}`;
}

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  worldVersion: 0,
  plans: [],
  signals: [],
  auditEntries: [],
  selectedPlanIds: [],
  loading: false,

  async loadAll() {
    set({ loading: true, errorMessage: undefined });
    const [picture, plans, signals, audit] = await Promise.all([
      apiClient.get<OperationalPicture>(`/api/scenarios/${SCENARIO_ID}/picture`),
      apiClient.get<PlanSummary[]>(`/api/scenarios/${SCENARIO_ID}/plans`),
      apiClient.get<SignalSummary[]>(`/api/scenarios/${SCENARIO_ID}/signals`),
      apiClient.get<AuditEntrySummary[]>(`/api/scenarios/${SCENARIO_ID}/audit`),
    ]);
    set({
      loading: false,
      picture: picture.ok ? picture.data : undefined,
      worldVersion: picture.ok ? picture.world.version : get().worldVersion,
      plans: plans.ok ? plans.data : [],
      signals: signals.ok ? signals.data : [],
      auditEntries: audit.ok ? audit.data : [],
      errorMessage: !picture.ok ? picture.error.message : undefined,
    });
  },

  async generatePlans(strategies) {
    const result = await apiClient.post<PlanSummary[]>(`/api/scenarios/${SCENARIO_ID}/plans/simulate`, {
      basisWorldVersion: get().worldVersion,
      ...(strategies ? { strategies } : {}),
    });
    if (result.ok) {
      set((state) => ({ plans: [...state.plans, ...result.data] }));
    } else {
      set({ errorMessage: result.error.message });
    }
  },

  toggleSelectedPlan(planId) {
    set((state) => ({
      selectedPlanIds: state.selectedPlanIds.includes(planId)
        ? state.selectedPlanIds.filter((id) => id !== planId)
        : [...state.selectedPlanIds, planId],
    }));
  },

  async comparePlans() {
    const planIds = get().selectedPlanIds;
    if (planIds.length < 2) return;
    const result = await apiClient.post<{ plans: PlanSummary[]; recommendedPlanId?: string }>(
      `/api/scenarios/${SCENARIO_ID}/plans/compare`,
      { planIds },
    );
    if (result.ok) set({ comparison: result.data });
    else set({ errorMessage: result.error.message });
  },

  async stagePlan(planId) {
    const result = await apiClient.post<PlanSummary>(`/api/scenarios/${SCENARIO_ID}/plans/${planId}/stage`, {
      operationId: nextOperationId("stage"),
    });
    if (result.ok) {
      set((state) => ({ plans: state.plans.map((p) => (p.id === planId ? result.data : p)) }));
      await get().loadAll();
    } else {
      set({ errorMessage: result.error.message });
    }
  },

  // HUMAN-ONLY: calls the API directly, never through WebMCP.
  async approvePlan(planId, actor) {
    const result = await apiClient.post<{ plan: PlanSummary }>(
      `/api/scenarios/${SCENARIO_ID}/plans/${planId}/approve`,
      { actor, operationId: nextOperationId("approve") },
    );
    if (result.ok) {
      set((state) => ({ plans: state.plans.map((p) => (p.id === planId ? result.data.plan : p)) }));
      await get().loadAll();
    } else {
      set({ errorMessage: result.error.message });
    }
  },

  // HUMAN-ONLY: calls the API directly, never through WebMCP.
  async rejectPlan(planId, actor, reason) {
    const result = await apiClient.post<PlanSummary>(`/api/scenarios/${SCENARIO_ID}/plans/${planId}/reject`, {
      actor,
      reason,
      operationId: nextOperationId("reject"),
    });
    if (result.ok) {
      set((state) => ({ plans: state.plans.map((p) => (p.id === planId ? result.data : p)) }));
      await get().loadAll();
    } else {
      set({ errorMessage: result.error.message });
    }
  },

  async correlateSignals(signalIds) {
    const result = await apiClient.post<SignalSummary[]>(`/api/scenarios/${SCENARIO_ID}/signals/correlate`, {
      signalIds,
      operationId: nextOperationId("correlate"),
    });
    if (result.ok) {
      await get().loadAll();
    } else {
      set({ errorMessage: result.error.message });
    }
  },

  setFocusEntity(entityId) {
    set({ focusEntityId: entityId });
  },
}));
