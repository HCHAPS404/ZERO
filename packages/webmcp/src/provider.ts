import type { AgentToolResult } from "@zero/contracts";
import type { WebMcpHttpClient } from "./http-client.js";
import type { ToolDefinition } from "./types.js";

export interface RegisteredToolHandle {
  unregister(): void;
}

/**
 * WebMcpProvider is the seam between our tool definitions and whatever
 * concrete browser WebMCP API is available. Tools are registered/
 * unregistered through this interface only -- nothing else in this package
 * (or in apps/web) talks to a browser global directly, so tools can be
 * dynamically registered/unregistered as the operator's context changes
 * (e.g. only exposing incident-specific tools while an incident is
 * focused) without touching tool implementations.
 */
export interface WebMcpProvider {
  registerTool<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    client: WebMcpHttpClient,
  ): RegisteredToolHandle;
  registerAll(
    tools: readonly ToolDefinition<any, unknown>[],
    client: WebMcpHttpClient,
  ): readonly RegisteredToolHandle[];
}

/**
 * Loosely-typed shape of the emerging imperative WebMCP browser API
 * (`navigator.modelContext.registerTool`). The exact contract is still
 * evolving upstream; this adapter intentionally isolates that uncertainty
 * to a single file. When the spec stabilizes, only BrowserWebMcpProvider
 * should need to change.
 */
interface ImperativeModelContext {
  registerTool(descriptor: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: unknown) => Promise<unknown>;
  }): { remove?: () => void } | (() => void) | void;
}

export class BrowserWebMcpProvider implements WebMcpProvider {
  constructor(private readonly modelContext: ImperativeModelContext) {}

  registerTool<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    client: WebMcpHttpClient,
  ): RegisteredToolHandle {
    const disposer = this.modelContext.registerTool({
      name: tool.name,
      description: tool.description,
      // A minimal placeholder JSON Schema. TASK-WEBMCP-EVALS.md tracks
      // wiring a real zod -> JSON Schema conversion once the upstream
      // WebMCP tool-schema contract is finalized.
      inputSchema: { type: "object" },
      execute: (input: unknown) => tool.execute(input, client),
    });
    return {
      unregister: () => {
        if (typeof disposer === "function") disposer();
        else disposer?.remove?.();
      },
    };
  }

  registerAll(
    tools: readonly ToolDefinition<any, unknown>[],
    client: WebMcpHttpClient,
  ): readonly RegisteredToolHandle[] {
    return tools.map((tool) => this.registerTool(tool, client));
  }
}

/**
 * Development/test fallback used whenever no browser WebMCP global is
 * present (Node, Vitest, SSR, or a browser that hasn't implemented WebMCP
 * yet) so builds and tests never depend on a real browser.
 */
export class MockWebMcpProvider implements WebMcpProvider {
  private readonly registry = new Map<string, { tool: ToolDefinition<any, unknown>; client: WebMcpHttpClient }>();

  registerTool<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    client: WebMcpHttpClient,
  ): RegisteredToolHandle {
    this.registry.set(tool.name, { tool: tool as unknown as ToolDefinition<any, unknown>, client });
    return { unregister: () => this.registry.delete(tool.name) };
  }

  registerAll(
    tools: readonly ToolDefinition<any, unknown>[],
    client: WebMcpHttpClient,
  ): readonly RegisteredToolHandle[] {
    return tools.map((tool) => this.registerTool(tool, client));
  }

  listRegisteredToolNames(): readonly string[] {
    return [...this.registry.keys()];
  }

  async invoke(name: string, rawInput: unknown): Promise<AgentToolResult<unknown>> {
    const entry = this.registry.get(name);
    if (!entry) {
      return {
        ok: false,
        world: { scenarioId: "unknown", version: 0, timestamp: new Date().toISOString() },
        error: { code: "TOOL_NOT_FOUND", message: `No tool registered as "${name}".`, recoverable: false, recommendedAction: "NONE" },
        warnings: [],
      };
    }
    return entry.tool.execute(rawInput, entry.client);
  }
}

function getBrowserModelContext(): ImperativeModelContext | undefined {
  const nav = (globalThis as { navigator?: { modelContext?: unknown } }).navigator;
  const modelContext = nav?.modelContext as ImperativeModelContext | undefined;
  return typeof modelContext?.registerTool === "function" ? modelContext : undefined;
}

export function createWebMcpProvider(): WebMcpProvider {
  const modelContext = getBrowserModelContext();
  return modelContext ? new BrowserWebMcpProvider(modelContext) : new MockWebMcpProvider();
}
