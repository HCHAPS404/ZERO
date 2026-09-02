import { pgTable, text, integer, doublePrecision, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Drizzle/PostgreSQL schema, prepared but not required for Phase 01 tests
 * (see docs/tasks/TASK-POSTGRES-PERSISTENCE.md). Every table keeps
 * `payload: jsonb` holding the full domain-shaped entity alongside a
 * handful of promoted columns used for querying/indexing, so the
 * PostgreSQL adapter can satisfy the same application ports as the
 * in-memory adapters without a large hand-written ORM mapping layer.
 *
 * Location fields are `lat`/`lon` double precision columns for now.
 * TASK-POSTGRES-PERSISTENCE.md tracks migrating them to a PostGIS
 * `geography(Point, 4326)` column (via `pgSchema`/custom type) once
 * PostGIS is provisioned on the target Postgres instance -- the payload
 * jsonb already carries the same {lat, lon} shape the domain layer uses,
 * so no domain code needs to change when that migration happens.
 */

export const scenarios = pgTable("scenarios", {
  id: text("id").primaryKey(),
  worldVersion: integer("world_version").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
});

export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  status: text("status").notNull(),
  severity: text("severity").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
});

export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  districtId: text("district_id").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  payload: jsonb("payload").notNull(),
});

export const facilities = pgTable("facilities", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  kind: text("kind").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  payload: jsonb("payload").notNull(),
});

export const infrastructure = pgTable("infrastructure", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  payload: jsonb("payload").notNull(),
});

export const roadSegments = pgTable("road_segments", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  fromNodeId: text("from_node_id").notNull(),
  toNodeId: text("to_node_id").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
});

export const graphNodes = pgTable("graph_nodes", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  payload: jsonb("payload").notNull(),
});

export const hazards = pgTable("hazards", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  riskLevel: text("risk_level").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  payload: jsonb("payload").notNull(),
});

export const signals = pgTable("signals", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  status: text("status").notNull(),
  trustLevel: text("trust_level").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
});

export const intelArtifacts = pgTable("intel_artifacts", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  status: text("status").notNull(),
  trustLevel: text("trust_level").notNull(),
  payload: jsonb("payload").notNull(),
});

export const responsePlans = pgTable("response_plans", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  strategy: text("strategy").notNull(),
  status: text("status").notNull(),
  basisWorldVersion: integer("basis_world_version").notNull(),
  score: doublePrecision("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
});

export const operations = pgTable("operations", {
  id: text("id").primaryKey(),
  responsePlanId: text("response_plan_id").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  payload: jsonb("payload").notNull(),
});

export const domainEvents = pgTable("domain_events", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  type: text("type").notNull(),
  worldVersion: integer("world_version").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  operationId: text("operation_id"),
  payload: jsonb("payload").notNull(),
});

export const auditEntries = pgTable("audit_entries", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  actor: text("actor").notNull(),
  actorKind: text("actor_kind").notNull(),
  action: text("action").notNull(),
  subjectId: text("subject_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  operationId: text("operation_id"),
  metadata: jsonb("metadata"),
});

/**
 * operationId -> stored UseCaseResult. Composite-free: operationId is
 * globally unique per section 17 (every mutating command supplies one).
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    operationId: text("operation_id").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ pk: primaryKey({ columns: [table.operationId] }) }),
);
