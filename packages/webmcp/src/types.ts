import type { ZodType } from "zod";
import type { AgentToolResult } from "@zero/contracts";
import type { WebMcpHttpClient } from "./http-client.js";

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodType<TInput>;
  execute(rawInput: unknown, client: WebMcpHttpClient): Promise<AgentToolResult<TOutput>>;
}

export function invalidInputResult(scenarioId: string, message: string): AgentToolResult<never> {
  return {
    ok: false,
    world: { scenarioId, version: 0, timestamp: new Date().toISOString() },
    error: { code: "INVALID_INPUT", message, recoverable: false, recommendedAction: "NONE" },
    warnings: [],
  };
}
