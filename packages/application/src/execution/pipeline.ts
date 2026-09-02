import { ZodError, type ZodType } from "zod";
import {
  asAuditEntryId,
  asScenarioId,
  isDomainError,
  UnauthorizedActionError,
  type DomainErrorShape,
  type DomainEvent,
} from "@zero/domain";
import type {
  AuditRepository,
  Clock,
  EventRepository,
  IdempotencyRepository,
  IdGenerator,
  ScenarioRepository,
} from "../ports/index.js";

export interface UseCaseContext {
  readonly scenarioRepository: ScenarioRepository;
  readonly auditRepository: AuditRepository;
  readonly eventRepository: EventRepository;
  readonly idempotencyRepository: IdempotencyRepository;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export type CallerKind = "HUMAN" | "AGENT" | "SYSTEM";

export interface CallerContext {
  readonly actor: string;
  readonly actorKind: CallerKind;
}

export type UseCaseResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: DomainErrorShape };

export interface PipelineOutcome<T> {
  readonly data: T;
  readonly action: string;
  readonly subjectId: string;
  readonly events?: readonly DomainEvent[];
}

function toDomainErrorShape(error: unknown): DomainErrorShape {
  if (isDomainError(error)) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      recommendedAction: error.recommendedAction,
    };
  }
  if (error instanceof ZodError) {
    return {
      code: "INVALID_INPUT",
      message: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      recoverable: false,
      recommendedAction: "NONE",
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "INTERNAL_ERROR",
    message,
    recoverable: false,
    recommendedAction: "NONE",
  };
}

/**
 * Reusable execution pipeline shared by every mutating and read-side use
 * case:
 *   input validation -> semantic validation -> policy check
 *   -> world-version check -> handler (domain invariants + persistence)
 *   -> domain events -> audit append -> structured response
 *
 * Both the WebMCP adapter and the human-facing API/UI call use cases built
 * on this pipeline, so there is exactly one business-logic path.
 */
export async function runPipeline<TInput extends { scenarioId: string }, TOutput>(params: {
  readonly schema: ZodType<TInput>;
  readonly rawInput: unknown;
  readonly ctx: UseCaseContext;
  readonly caller: CallerContext;
  readonly operationId?: string | undefined;
  readonly policyCheck?: (input: TInput, caller: CallerContext) => void;
  readonly handler: (input: TInput, ctx: UseCaseContext) => Promise<PipelineOutcome<TOutput>>;
}): Promise<UseCaseResult<TOutput>> {
  const { schema, rawInput, ctx, caller, operationId, policyCheck, handler } = params;

  if (operationId) {
    const existing = await ctx.idempotencyRepository.find(operationId);
    if (existing !== undefined) {
      return existing as UseCaseResult<TOutput>;
    }
  }

  try {
    const input = schema.parse(rawInput);
    policyCheck?.(input, caller);

    const outcome = await handler(input, ctx);

    for (const event of outcome.events ?? []) {
      await ctx.eventRepository.append(asScenarioId(input.scenarioId), event);
    }

    await ctx.auditRepository.append(asScenarioId(input.scenarioId), {
      id: asAuditEntryId(ctx.idGenerator.next("audit")),
      actor: caller.actor,
      actorKind: caller.actorKind,
      action: outcome.action,
      subjectId: outcome.subjectId,
      occurredAt: ctx.clock.now(),
      ...(operationId ? { operationId } : {}),
    });

    const result: UseCaseResult<TOutput> = { ok: true, data: outcome.data };
    if (operationId) {
      await ctx.idempotencyRepository.save(operationId, result);
    }
    return result;
  } catch (error) {
    const result: UseCaseResult<TOutput> = { ok: false, error: toDomainErrorShape(error) };
    if (operationId) {
      await ctx.idempotencyRepository.save(operationId, result);
    }
    return result;
  }
}

/**
 * Best-effort, pre-validation extraction of `operationId` from raw input so
 * the idempotency short-circuit can run before zod parsing. If the field is
 * missing or malformed, schema.parse still enforces it downstream.
 */
export function extractOperationId(rawInput: unknown): string | undefined {
  if (
    typeof rawInput === "object" &&
    rawInput !== null &&
    "operationId" in rawInput &&
    typeof (rawInput as { operationId?: unknown }).operationId === "string"
  ) {
    return (rawInput as { operationId: string }).operationId;
  }
  return undefined;
}

/** Policy helper: consequential approval/rejection may only be exercised by a human actor. */
export function requireHumanCaller(_input: unknown, caller: CallerContext): void {
  if (caller.actorKind !== "HUMAN") {
    throw new UnauthorizedActionError(
      "Only a human-facing actor may approve or reject a response plan. Agents may stage and propose but never approve.",
    );
  }
}
