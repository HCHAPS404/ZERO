import type { IdempotencyRepository } from "@zero/application";

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private results = new Map<string, unknown>();

  async find(operationId: string): Promise<unknown | undefined> {
    return this.results.get(operationId);
  }

  async save(operationId: string, result: unknown): Promise<void> {
    this.results.set(operationId, result);
  }
}
