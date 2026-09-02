import type {
  SignalId,
  IntelArtifactId,
  ClaimId,
  EvidenceId,
  IncidentId,
} from "../ids.js";
import { InvalidStateTransitionError } from "../errors.js";

/**
 * Trust lifecycle for externally-observed information. External text is
 * always data, never an instruction, and never becomes operational truth
 * automatically -- it must be corroborated and, ultimately, accepted by a
 * human-facing use case before it can influence the OperationalWorld.
 */
export type TrustLevel = "UNTRUSTED" | "CORROBORATED" | "HUMAN_VERIFIED";

export type SignalLifecycleStatus =
  | "OBSERVED"
  | "CORROBORATED"
  | "PROPOSED_FACT"
  | "ACCEPTED"
  | "REJECTED";

export type SourceType =
  | "FIELD_RADIO"
  | "SENSOR"
  | "SOCIAL_MEDIA"
  | "NEWS_FEED"
  | "SYNTHETIC";

export interface Provenance {
  readonly sourceType: SourceType;
  readonly sourceIdentifier: string;
  readonly sourceUrl?: string;
  readonly capturedAt: string;
}

export interface Evidence {
  readonly id: EvidenceId;
  readonly description: string;
  readonly provenance: Provenance;
}

export interface Claim {
  readonly id: ClaimId;
  readonly text: string;
  readonly relatedIncidentId?: IncidentId;
}

export interface Signal {
  readonly id: SignalId;
  readonly sourceType: SourceType;
  readonly sourceIdentifier: string;
  readonly sourceUrl?: string;
  readonly observedAt: string;
  readonly rawClaim: string;
  readonly confidence: number;
  readonly trustLevel: TrustLevel;
  readonly status: SignalLifecycleStatus;
  readonly evidenceRefs: readonly EvidenceId[];
  readonly corroboratingSignalIds: readonly SignalId[];
}

export interface IntelArtifact {
  readonly id: IntelArtifactId;
  readonly claim: Claim;
  readonly supportingSignalIds: readonly SignalId[];
  readonly trustLevel: TrustLevel;
  readonly status: SignalLifecycleStatus;
}

const ALLOWED_SIGNAL_TRANSITIONS: Record<
  SignalLifecycleStatus,
  readonly SignalLifecycleStatus[]
> = {
  OBSERVED: ["CORROBORATED", "REJECTED"],
  CORROBORATED: ["PROPOSED_FACT", "REJECTED"],
  PROPOSED_FACT: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

export function canTransitionSignal(
  from: SignalLifecycleStatus,
  to: SignalLifecycleStatus,
): boolean {
  return ALLOWED_SIGNAL_TRANSITIONS[from].includes(to);
}

export function transitionSignal(
  signal: Signal,
  to: SignalLifecycleStatus,
): Signal {
  if (!canTransitionSignal(signal.status, to)) {
    throw new InvalidStateTransitionError("Signal", signal.status, to);
  }
  const trustLevel = deriveTrustLevel(to, signal.trustLevel);
  return { ...signal, status: to, trustLevel };
}

/**
 * Trust only ever escalates through corroboration or explicit human
 * verification (ACCEPTED). Rejection does not downgrade an already-verified
 * trust level retroactively -- it simply halts further propagation.
 */
function deriveTrustLevel(
  status: SignalLifecycleStatus,
  current: TrustLevel,
): TrustLevel {
  if (status === "CORROBORATED" && current === "UNTRUSTED") {
    return "CORROBORATED";
  }
  if (status === "ACCEPTED") {
    return "HUMAN_VERIFIED";
  }
  return current;
}

export function corroborate(
  signal: Signal,
  corroboratingSignalId: SignalId,
): Signal {
  const transitioned =
    signal.status === "OBSERVED"
      ? transitionSignal(signal, "CORROBORATED")
      : signal;
  return {
    ...transitioned,
    corroboratingSignalIds: [
      ...transitioned.corroboratingSignalIds,
      corroboratingSignalId,
    ],
  };
}
