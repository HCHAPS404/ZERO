/**
 * Typed domain errors. These are thrown by domain logic and are expected to
 * be caught and translated into structured AgentToolResult / API error
 * shapes by outer layers -- they must never leak as bare Error/string.
 */

export type RecommendedAction =
  | "REPLAN"
  | "RETRY"
  | "ESCALATE_TO_HUMAN"
  | "REFRESH_WORLD"
  | "NONE";

export interface DomainErrorShape {
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
  readonly recommendedAction: RecommendedAction;
}

export abstract class DomainError extends Error implements DomainErrorShape {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;
  abstract readonly recommendedAction: RecommendedAction;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class StaleWorldError extends DomainError {
  readonly code = "STALE_WORLD" as const;
  readonly recoverable = true;
  readonly recommendedAction: RecommendedAction = "REPLAN";
  readonly expectedVersion: number;
  readonly currentVersion: number;

  constructor(expectedVersion: number, currentVersion: number) {
    super(
      `Operation was computed against world version ${expectedVersion} but current world version is ${currentVersion}.`,
    );
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = "INVALID_STATE_TRANSITION" as const;
  readonly recoverable = false;
  readonly recommendedAction: RecommendedAction = "NONE";

  constructor(entity: string, from: string, to: string) {
    super(`Invalid ${entity} transition from ${from} to ${to}.`);
  }
}

export class ConstraintViolationError extends DomainError {
  readonly code = "CONSTRAINT_VIOLATION" as const;
  readonly recoverable = false;
  readonly recommendedAction: RecommendedAction = "REPLAN";

  constructor(message: string) {
    super(message);
  }
}

export class EntityNotFoundError extends DomainError {
  readonly code = "ENTITY_NOT_FOUND" as const;
  readonly recoverable = false;
  readonly recommendedAction: RecommendedAction = "NONE";

  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} was not found.`);
  }
}

export class UnreachableDestinationError extends DomainError {
  readonly code = "UNREACHABLE_DESTINATION" as const;
  readonly recoverable = false;
  readonly recommendedAction: RecommendedAction = "ESCALATE_TO_HUMAN";

  constructor(from: string, to: string) {
    super(`No route exists between ${from} and ${to}.`);
  }
}

export class UnauthorizedActionError extends DomainError {
  readonly code = "UNAUTHORIZED_ACTION" as const;
  readonly recoverable = false;
  readonly recommendedAction: RecommendedAction = "ESCALATE_TO_HUMAN";

  constructor(message: string) {
    super(message);
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
