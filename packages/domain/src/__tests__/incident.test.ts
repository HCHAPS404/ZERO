import { describe, expect, it } from "vitest";
import {
  asIncidentId,
  canTransitionIncident,
  transitionIncident,
  type Incident,
} from "../index.js";
import { InvalidStateTransitionError } from "../errors.js";

function makeIncident(status: Incident["status"]): Incident {
  return {
    id: asIncidentId("incident-1"),
    type: "STRUCTURE_COLLAPSE",
    status,
    severity: "HIGH",
    location: { lat: 0, lon: 0 },
    nearestGraphNodeId: "node-1",
    requiredCapabilityIds: [],
    casualtyEstimate: 3,
    reportedAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    description: "test incident",
  };
}

describe("Incident state machine", () => {
  it("allows valid forward transitions", () => {
    expect(canTransitionIncident("REPORTED", "VALIDATED")).toBe(true);
    expect(canTransitionIncident("VALIDATED", "ACTIVE")).toBe(true);
    expect(canTransitionIncident("ACTIVE", "STABILIZED")).toBe(true);
    expect(canTransitionIncident("STABILIZED", "RESOLVED")).toBe(true);
  });

  it("allows regressing from STABILIZED back to ACTIVE", () => {
    expect(canTransitionIncident("STABILIZED", "ACTIVE")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionIncident("REPORTED", "ACTIVE")).toBe(false);
    expect(canTransitionIncident("REPORTED", "RESOLVED")).toBe(false);
    expect(canTransitionIncident("RESOLVED", "ACTIVE")).toBe(false);
  });

  it("transitionIncident applies a valid transition", () => {
    const incident = makeIncident("REPORTED");
    const next = transitionIncident(incident, "VALIDATED", "2026-09-01T00:05:00.000Z");
    expect(next.status).toBe("VALIDATED");
    expect(next.updatedAt).toBe("2026-09-01T00:05:00.000Z");
    expect(incident.status).toBe("REPORTED");
  });

  it("transitionIncident throws InvalidStateTransitionError for an invalid transition", () => {
    const incident = makeIncident("REPORTED");
    expect(() => transitionIncident(incident, "RESOLVED", "2026-09-01T00:05:00.000Z")).toThrow(
      InvalidStateTransitionError,
    );
  });

  it("RESOLVED is a terminal state", () => {
    const incident = makeIncident("RESOLVED");
    expect(() => transitionIncident(incident, "ACTIVE", "2026-09-01T00:05:00.000Z")).toThrow(
      InvalidStateTransitionError,
    );
  });
});
