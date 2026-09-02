import type { RecommendedAction } from "@zero/domain";

/**
 * AgentToolResult is the canonical machine-readable envelope returned by
 * every WebMCP tool and every application use case that an agent-facing
 * surface exposes. Failures are always structured -- never bare prose --
 * so an agent can reason about recoverability programmatically.
 */
export interface AgentToolResultWorld {
  readonly scenarioId: string;
  readonly version: number;
  readonly timestamp: string;
}

export interface AgentToolError {
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
  readonly recommendedAction: RecommendedAction;
}

export interface AgentToolSuccess<TData> {
  readonly ok: true;
  readonly world: AgentToolResultWorld;
  readonly data: TData;
  readonly warnings: readonly string[];
  readonly evidence: readonly string[];
  readonly effects: readonly string[];
}

export interface AgentToolFailure {
  readonly ok: false;
  readonly world: AgentToolResultWorld;
  readonly error: AgentToolError;
  readonly warnings: readonly string[];
}

export type AgentToolResult<TData> = AgentToolSuccess<TData> | AgentToolFailure;

export function agentToolSuccess<TData>(
  world: AgentToolResultWorld,
  data: TData,
  options?: {
    readonly warnings?: readonly string[];
    readonly evidence?: readonly string[];
    readonly effects?: readonly string[];
  },
): AgentToolSuccess<TData> {
  return {
    ok: true,
    world,
    data,
    warnings: options?.warnings ?? [],
    evidence: options?.evidence ?? [],
    effects: options?.effects ?? [],
  };
}

export function agentToolFailure(
  world: AgentToolResultWorld,
  error: AgentToolError,
  warnings: readonly string[] = [],
): AgentToolFailure {
  return { ok: false, world, error, warnings };
}
