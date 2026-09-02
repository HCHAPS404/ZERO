import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

/**
 * Not imported by any Phase 01 test or the in-memory-backed apps/api
 * composition root. Wiring a Render-hosted Postgres instance to this
 * client, and swapping InMemoryScenarioRepository for a
 * PostgresScenarioRepository built on it, is TASK-POSTGRES-PERSISTENCE.md.
 */
export function createPostgresClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export type PostgresClient = ReturnType<typeof createPostgresClient>;
