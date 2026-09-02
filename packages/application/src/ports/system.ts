/** Minimal system ports so use cases stay deterministic and testable. */
export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counters = new Map<string, number>();
  next(prefix: string): string {
    const current = this.counters.get(prefix) ?? 0;
    const value = current + 1;
    this.counters.set(prefix, value);
    return `${prefix}-${value}`;
  }
}
