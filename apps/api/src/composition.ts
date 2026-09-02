import {
  InMemoryAuditRepository,
  InMemoryEventRepository,
  InMemoryIdempotencyRepository,
  InMemoryScenarioRepository,
} from "@zero/persistence";
import { GraphAStarRoutingAdapter } from "@zero/routing";
import { DeterministicResponsePlanner } from "@zero/planner";
import { InMemoryWhatIfSimulationAdapter } from "@zero/simulation";
import { loadEarthquakeAlphaScenario } from "@zero/scenario-earthquake-alpha";
import { SequentialIdGenerator, SystemClock, type UseCaseContext } from "@zero/application";
import { ScenarioRoom } from "./realtime/scenario-room.js";

/**
 * The composition root: the one place in the whole system allowed to know
 * about every concrete adapter. Domain and application never import any of
 * these packages directly (see docs/architecture/OVERVIEW.md).
 */
export interface AppComposition {
  readonly ctx: UseCaseContext;
  readonly routingEngine: GraphAStarRoutingAdapter;
  readonly planner: DeterministicResponsePlanner;
  readonly simulation: InMemoryWhatIfSimulationAdapter;
  readonly scenarioRepository: InMemoryScenarioRepository;
  readonly scenarioRoom: ScenarioRoom;
}

export function buildComposition(): AppComposition {
  const scenarioRepository = new InMemoryScenarioRepository();
  scenarioRepository.seedWorld(loadEarthquakeAlphaScenario());

  const ctx: UseCaseContext = {
    scenarioRepository,
    auditRepository: new InMemoryAuditRepository(),
    eventRepository: new InMemoryEventRepository(),
    idempotencyRepository: new InMemoryIdempotencyRepository(),
    clock: new SystemClock(),
    idGenerator: new SequentialIdGenerator(),
  };

  const routingEngine = new GraphAStarRoutingAdapter();
  const planner = new DeterministicResponsePlanner(routingEngine);
  const simulation = new InMemoryWhatIfSimulationAdapter(routingEngine);
  const scenarioRoom = new ScenarioRoom();

  return { ctx, routingEngine, planner, simulation, scenarioRepository, scenarioRoom };
}
