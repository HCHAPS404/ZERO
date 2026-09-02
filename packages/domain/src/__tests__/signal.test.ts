import { describe, expect, it } from "vitest";
import {
  asEvidenceId,
  asSignalId,
  corroborate,
  transitionSignal,
  type Signal,
} from "../index.js";
import { InvalidStateTransitionError } from "../errors.js";

function makeSignal(): Signal {
  return {
    id: asSignalId("signal-1"),
    sourceType: "SYNTHETIC",
    sourceIdentifier: "sensor-north-1",
    observedAt: "2026-09-01T00:00:00.000Z",
    rawClaim: "Bridge 17 reported impassable.",
    confidence: 0.4,
    trustLevel: "UNTRUSTED",
    status: "OBSERVED",
    evidenceRefs: [asEvidenceId("evidence-1")],
    corroboratingSignalIds: [],
  };
}

describe("Trust promotion rules", () => {
  it("starts UNTRUSTED / OBSERVED", () => {
    const signal = makeSignal();
    expect(signal.trustLevel).toBe("UNTRUSTED");
    expect(signal.status).toBe("OBSERVED");
  });

  it("promotes to CORROBORATED trust once corroborated by another signal", () => {
    const signal = corroborate(makeSignal(), asSignalId("signal-2"));
    expect(signal.status).toBe("CORROBORATED");
    expect(signal.trustLevel).toBe("CORROBORATED");
    expect(signal.corroboratingSignalIds).toContain(asSignalId("signal-2"));
  });

  it("only reaches HUMAN_VERIFIED trust via explicit ACCEPTED transition", () => {
    let signal = corroborate(makeSignal(), asSignalId("signal-2"));
    signal = transitionSignal(signal, "PROPOSED_FACT");
    expect(signal.trustLevel).toBe("CORROBORATED");
    signal = transitionSignal(signal, "ACCEPTED");
    expect(signal.trustLevel).toBe("HUMAN_VERIFIED");
    expect(signal.status).toBe("ACCEPTED");
  });

  it("rejects skipping the corroboration step", () => {
    const signal = makeSignal();
    expect(() => transitionSignal(signal, "PROPOSED_FACT")).toThrow(InvalidStateTransitionError);
  });

  it("ACCEPTED and REJECTED are terminal", () => {
    const signal = makeSignal();
    const rejected = transitionSignal(signal, "REJECTED");
    expect(() => transitionSignal(rejected, "CORROBORATED")).toThrow(InvalidStateTransitionError);
  });
});
