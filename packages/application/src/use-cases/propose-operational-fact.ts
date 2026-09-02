import {
  asClaimId,
  asDomainEventId,
  asIntelArtifactId,
  asScenarioId,
  asSignalId,
  ConstraintViolationError,
  EntityNotFoundError,
  upsertIntelArtifact,
  type DomainEvent,
  type IntelArtifact,
  type TrustLevel,
} from "@zero/domain";
import { ProposeOperationalFactInputSchema, type ProposeOperationalFactInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

const TRUST_RANK: Record<TrustLevel, number> = {
  UNTRUSTED: 0,
  CORROBORATED: 1,
  HUMAN_VERIFIED: 2,
};

/**
 * An agent may propose a fact from corroborated signals, but the fact only
 * reaches ACCEPTED (i.e. becomes operational truth, emitting
 * OperationalFactAccepted) when a human is the caller. An agent-proposed
 * fact stops at PROPOSED_FACT and awaits human review -- it is never
 * auto-accepted.
 */
export async function proposeOperationalFact(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<IntelArtifact>> {
  return runPipeline<ProposeOperationalFactInput, IntelArtifact>({
    schema: ProposeOperationalFactInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      let world = await context.scenarioRepository.getWorld(scenarioId);
      const now = context.clock.now();

      const supportingSignals = input.supportingSignalIds.map((rawId) => {
        const signal = world.signals.get(asSignalId(rawId));
        if (!signal) {
          throw new EntityNotFoundError("Signal", rawId);
        }
        return signal;
      });

      const bestTrust = supportingSignals.reduce<TrustLevel>(
        (best, signal) => (TRUST_RANK[signal.trustLevel] > TRUST_RANK[best] ? signal.trustLevel : best),
        "UNTRUSTED",
      );
      if (TRUST_RANK[bestTrust] < TRUST_RANK.CORROBORATED) {
        throw new ConstraintViolationError(
          "At least one supporting signal must be CORROBORATED or HUMAN_VERIFIED before a fact can be proposed.",
        );
      }

      const accept = caller.actorKind === "HUMAN";
      const artifact: IntelArtifact = {
        id: asIntelArtifactId(context.idGenerator.next("intel")),
        claim: {
          id: asClaimId(context.idGenerator.next("claim")),
          text: input.claimText,
          ...(input.relatedIncidentId ? { relatedIncidentId: input.relatedIncidentId as never } : {}),
        },
        supportingSignalIds: input.supportingSignalIds.map(asSignalId),
        trustLevel: accept ? "HUMAN_VERIFIED" : bestTrust,
        status: accept ? "ACCEPTED" : "PROPOSED_FACT",
      };

      world = upsertIntelArtifact(world, artifact, now);
      await context.scenarioRepository.saveWorld(world);

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: accept ? "OperationalFactAccepted" : "SignalCorroborated",
          scenarioId: input.scenarioId,
          worldVersion: world.version,
          occurredAt: now,
          payload: { intelArtifactId: artifact.id, claimText: input.claimText },
        },
      ];

      return { data: artifact, action: "ProposeOperationalFact", subjectId: artifact.id, events };
    },
  });
}
