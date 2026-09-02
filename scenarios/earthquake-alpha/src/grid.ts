import { asGraphNodeId, asRoadSegmentId, type GraphNode, type RoadSegment } from "@zero/domain";

const ROWS = 5;
const COLS = 5;
const CELL_DEGREES = 0.006;
const ORIGIN = { lat: 37.77, lon: -122.44 };
const BASE_TRAVEL_TIME_PER_CELL_SECONDS = 90;
const CELL_DISTANCE_METERS = 650;

export function gridNodeId(row: number, col: number): string {
  return `N-${row}-${col}`;
}

/**
 * Deterministic 5x5 city grid (25 graph nodes). No randomness -- the same
 * coordinates and IDs are produced on every run, satisfying the "loads
 * deterministically" requirement for the demo scenario.
 */
export function buildGridNodes(): ReadonlyMap<ReturnType<typeof asGraphNodeId>, GraphNode> {
  const nodes = new Map<ReturnType<typeof asGraphNodeId>, GraphNode>();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const id = asGraphNodeId(gridNodeId(row, col));
      nodes.set(id, {
        id,
        label: gridNodeId(row, col),
        location: {
          lat: Number((ORIGIN.lat + row * CELL_DEGREES).toFixed(6)),
          lon: Number((ORIGIN.lon + col * CELL_DEGREES).toFixed(6)),
        },
      });
    }
  }
  return nodes;
}

export function buildGridRoadSegments(): ReadonlyMap<ReturnType<typeof asRoadSegmentId>, RoadSegment> {
  const segments = new Map<ReturnType<typeof asRoadSegmentId>, RoadSegment>();

  const addSegment = (id: string, fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const segmentId = asRoadSegmentId(id);
    segments.set(segmentId, {
      id: segmentId,
      from: asGraphNodeId(gridNodeId(fromRow, fromCol)),
      to: asGraphNodeId(gridNodeId(toRow, toCol)),
      distanceMeters: CELL_DISTANCE_METERS,
      baseTravelTimeSeconds: BASE_TRAVEL_TIME_PER_CELL_SECONDS,
      status: "OPEN",
      hazardPenaltySeconds: 0,
      bidirectional: true,
    });
  };

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS - 1; col += 1) {
      addSegment(`ROAD-H-${row}-${col}`, row, col, row, col + 1);
    }
  }
  for (let row = 0; row < ROWS - 1; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      addSegment(`ROAD-V-${row}-${col}`, row, col, row + 1, col);
    }
  }

  return segments;
}
