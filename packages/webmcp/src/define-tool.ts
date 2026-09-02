import type { ZodType } from "zod";
import type { AgentToolResult } from "@zero/contracts";
import type { WebMcpHttpClient } from "./http-client.js";
import { invalidInputResult, type ToolDefinition } from "./types.js";

/**
 * Wraps every tool with the same input-validation step so a malformed call
 * never reaches the network -- it fails fast with a structured
 * INVALID_INPUT AgentToolResult, exactly like every other failure mode.
 */
export function defineTool<TInput extends { scenarioId: string }, TOutput>(
  name: string,
  description: string,
  schema: ZodType<TInput>,
  call: (input: TInput, client: WebMcpHttpClient) => Promise<AgentToolResult<TOutput>>,
): ToolDefinition<TInput, TOutput> {
  return {
    name,
    description,
    inputSchema: schema,
    async execute(rawInput, client) {
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) {
        const scenarioId =
          typeof rawInput === "object" && rawInput !== null && "scenarioId" in rawInput &&
          typeof (rawInput as { scenarioId?: unknown }).scenarioId === "string"
            ? (rawInput as { scenarioId: string }).scenarioId
            : "unknown";
        return invalidInputResult(
          scenarioId,
          parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
        );
      }
      return call(parsed.data, client);
    },
  };
}
