import { ALL_TOOLS, WebMcpHttpClient, createWebMcpProvider } from "@zero/webmcp";
import { apiClient } from "./api/client.js";

/**
 * Registers every WebMCP tool with whatever provider is available in this
 * browser (a real imperative WebMCP implementation if present, otherwise
 * the in-memory mock so the app still runs). This is the ONLY place the
 * web app touches @zero/webmcp -- it never imports @zero/application or
 * calls a use case directly; every tool call goes over HTTP to the same
 * API the human UI uses.
 */
export function bootstrapWebMcp(): void {
  const provider = createWebMcpProvider();
  const client = new WebMcpHttpClient({ baseUrl: apiClient.baseUrl });
  const handles = provider.registerAll(ALL_TOOLS, client);
  // eslint-disable-next-line no-console
  console.info(`[webmcp] registered ${handles.length} tools:`, ALL_TOOLS.map((t) => t.name).join(", "));
}
