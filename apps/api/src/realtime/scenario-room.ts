import { EventEmitter } from "node:events";

export interface RoomMessage {
  readonly type: string;
  readonly scenarioId: string;
  readonly payload: unknown;
  readonly occurredAt: string;
}

/**
 * A minimal in-process publish/subscribe abstraction, deliberately not
 * coupled to any cloud provider. Phase 01 has no real transport attached to
 * it (there is no WebSocket route yet) -- it exists so domain events and
 * FocusOperatorView directives have exactly one broadcast point to call.
 * TASK-RENDER-REALTIME.md describes wiring a Render WebSocket endpoint on
 * top of this same interface in Phase 02 without touching application code.
 */
export class ScenarioRoom {
  private readonly emitter = new EventEmitter();

  publish(message: RoomMessage): void {
    this.emitter.emit(message.scenarioId, message);
  }

  subscribe(scenarioId: string, listener: (message: RoomMessage) => void): () => void {
    this.emitter.on(scenarioId, listener);
    return () => this.emitter.off(scenarioId, listener);
  }
}
