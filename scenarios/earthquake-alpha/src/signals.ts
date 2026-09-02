import { asEvidenceId, asSignalId, type Signal } from "@zero/domain";

/**
 * Deterministic synthetic signals -- no network calls. These stand in for
 * what Tavily/Vapi/Apify feeds will later populate (see docs/tasks). Two
 * signals corroborate the same bridge-closure claim to give
 * CorrelateSignals/ProposeOperationalFact something concrete to work with.
 */
export const SIGNALS: readonly Signal[] = [
  {
    id: asSignalId("signal-bridge17-radio"),
    sourceType: "FIELD_RADIO",
    sourceIdentifier: "engine-2-radio",
    observedAt: "2026-01-15T08:02:00.000Z",
    rawClaim: "Bridge 17 impassable, deck buckled at the north approach.",
    confidence: 0.7,
    trustLevel: "UNTRUSTED",
    status: "OBSERVED",
    evidenceRefs: [asEvidenceId("evidence-bridge17-photo")],
    corroboratingSignalIds: [],
  },
  {
    id: asSignalId("signal-bridge17-sensor"),
    sourceType: "SENSOR",
    sourceIdentifier: "structural-sensor-b17",
    observedAt: "2026-01-15T08:03:00.000Z",
    rawClaim: "Structural strain sensor on Bridge 17 exceeded safety threshold.",
    confidence: 0.9,
    trustLevel: "UNTRUSTED",
    status: "OBSERVED",
    evidenceRefs: [asEvidenceId("evidence-bridge17-sensor-log")],
    corroboratingSignalIds: [],
  },
  {
    id: asSignalId("signal-aftershock-sensor"),
    sourceType: "SENSOR",
    sourceIdentifier: "seismic-sensor-4",
    observedAt: "2026-01-15T08:05:00.000Z",
    rawClaim: "Seismic sensor reports elevated aftershock probability near grid sector 3-3.",
    confidence: 0.65,
    trustLevel: "UNTRUSTED",
    status: "OBSERVED",
    evidenceRefs: [],
    corroboratingSignalIds: [],
  },
  {
    id: asSignalId("signal-unverified-social"),
    sourceType: "SOCIAL_MEDIA",
    sourceIdentifier: "@localwitness_42",
    observedAt: "2026-01-15T08:07:00.000Z",
    rawClaim: "Hearing there might be a second collapse near the overpass, unconfirmed.",
    confidence: 0.2,
    trustLevel: "UNTRUSTED",
    status: "OBSERVED",
    evidenceRefs: [],
    corroboratingSignalIds: [],
  },
];
