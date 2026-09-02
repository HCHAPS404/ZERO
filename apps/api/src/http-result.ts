import { agentToolFailure, agentToolSuccess, type AgentToolResult, type AgentToolResultWorld } from "@zero/contracts";
import type { UseCaseResult } from "@zero/application";

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  STALE_WORLD: 409,
  ENTITY_NOT_FOUND: 404,
  UNAUTHORIZED_ACTION: 403,
  INVALID_INPUT: 400,
  INVALID_STATE_TRANSITION: 409,
  CONSTRAINT_VIOLATION: 422,
  UNREACHABLE_DESTINATION: 404,
  INTERNAL_ERROR: 500,
};

/**
 * Use-case results can carry domain Maps (e.g. OperationalSnapshot's
 * incidents/resources/... fields). JSON.stringify silently turns a Map
 * into "{}", so every HTTP response is round-tripped through a replacer
 * that converts Map -> an array of [key, value] pairs before it reaches
 * c.json().
 */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, val) => (val instanceof Map ? [...val.entries()] : val)));
}

export function toHttpResponse<T>(
  result: UseCaseResult<T>,
  world: AgentToolResultWorld,
): { status: number; body: AgentToolResult<T> } {
  if (result.ok) {
    return { status: 200, body: toJsonSafe(agentToolSuccess(world, result.data)) };
  }
  const status = STATUS_BY_ERROR_CODE[result.error.code] ?? 400;
  return { status, body: agentToolFailure(world, result.error) };
}
