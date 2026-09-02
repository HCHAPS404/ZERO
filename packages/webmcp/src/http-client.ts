import type { AgentToolResult } from "@zero/contracts";

export interface WebMcpHttpClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Every WebMCP tool talks to the exact same Hono API endpoints the React
 * Command Center calls -- there is no separate "agent" business logic path.
 * apps/api's route handlers already translate UseCaseResult into
 * AgentToolResult (see apps/api/src/http-result.ts), so this client is a
 * thin, typed pass-through.
 */
export class WebMcpHttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebMcpHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get<T>(path: string): Promise<AgentToolResult<T>> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { method: "GET" });
    return (await response.json()) as AgentToolResult<T>;
  }

  async post<T>(path: string, body: unknown): Promise<AgentToolResult<T>> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as AgentToolResult<T>;
  }
}
