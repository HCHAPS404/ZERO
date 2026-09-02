/**
 * Reusable idempotency guard for mutating commands. A command supplies an
 * `operationId`; if that id has already been recorded, the previously
 * computed result is replayed instead of re-executing the mutation, so
 * retries never duplicate state changes, domain events or audit records.
 */
export interface IdempotencyRepository {
  find(operationId: string): Promise<unknown | undefined>;
  save(operationId: string, result: unknown): Promise<void>;
}
