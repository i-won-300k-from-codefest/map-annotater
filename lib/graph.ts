import type { Edge, Position, Vertex } from "@/lib/types";

const polygonArea = (points: Position[]): number => {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

const pointToSegmentDistance = (
  point: Position,
  start: Position,
  end: Position,
): number => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }
  const t =
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
    (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const closestX = start[0] + clampedT * dx;
  const closestY = start[1] + clampedT * dy;
  return Math.hypot(point[0] - closestX, point[1] - closestY);
};

const pointInPolygon = (
  point: Position,
  polygon: Position[],
  tolerance: number,
): boolean => {
  if (polygon.length < 3) return false;

  for (let i = 0; i < polygon.length; i += 1) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    if (pointToSegmentDistance(point, start, end) <= tolerance) {
      return true;
    }
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersectsYRange = yi > point[1] !== yj > point[1];
    if (!intersectsYRange) continue;

    const xIntersection = ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (point[0] < xIntersection) {
      inside = !inside;
    }
  }

  return inside;
};

const canonicalizeCycle = (cycle: string[]): string => {
  if (cycle.length === 0) return "";
  const sequences: string[][] = [];
  const forward = [...cycle];
  const backward = [...cycle].reverse();

  const pushRotations = (arr: string[]) => {
    for (let i = 0; i < arr.length; i += 1) {
      sequences.push([...arr.slice(i), ...arr.slice(0, i)]);
    }
  };

  pushRotations(forward);
  pushRotations(backward);

  let best = sequences[0];
  for (let i = 1; i < sequences.length; i += 1) {
    const candidate = sequences[i];
    if (candidate.join("->") < best.join("->")) {
      best = candidate;
    }
  }

  return best.join("->");
};

interface LoopInfo {
  cycle: string[];
  points: Position[];
  area: number;
}

interface LoopRing {
  nodeIds: string[];
  points: Position[];
  area: number;
}

export interface ClosedLoop {
  boundary: LoopRing;
  holes: LoopRing[];
  netArea: number;
}

export const findClosedLoops = (nodes: Vertex[], edges: Edge[]): ClosedLoop[] => {
  if (nodes.length < 3 || edges.length < 3) {
    return [] as ClosedLoop[];
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();

  edges.forEach((edge) => {
    if (edge.source === edge.target) return;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const stackIndex = new Map<string, number>();
  const cycles: string[][] = [];
  const seenKeys = new Set<string>();

  const recordCycle = (startIndex: number) => {
    const slice = stack.slice(startIndex);
    const ordered = Array.from(new Set(slice));
    if (ordered.length < 3) return;
    const key = canonicalizeCycle(ordered);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    cycles.push(ordered);
  };

  const dfs = (nodeId: string, parent: string | null) => {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);
    stackIndex.set(nodeId, stack.length - 1);

    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      neighbors.forEach((neighbor) => {
        if (neighbor === parent) return;
        if (!visited.has(neighbor)) {
          dfs(neighbor, nodeId);
        } else if (inStack.has(neighbor)) {
          const startIndex = stackIndex.get(neighbor);
          if (startIndex !== undefined) {
            recordCycle(startIndex);
          }
        }
      });
    }

    stack.pop();
    stackIndex.delete(nodeId);
    inStack.delete(nodeId);
  };

  nodes.forEach((node) => {
    if (visited.has(node.id)) return;
    if (!adjacency.has(node.id)) return;
    dfs(node.id, null);
  });

  const loopInfos: LoopInfo[] = cycles.map((cycle) => {
    const points = cycle
      .map((nodeId) => nodesById.get(nodeId)?.position)
      .filter((position): position is Position => Boolean(position));
    return {
      cycle,
      points,
      area: polygonArea(points),
    };
  });

  const STACK_TOLERANCE = 8; // pixels; allows for minor drawing jitter when comparing loops

  const parents = new Array(loopInfos.length).fill(-1);

  for (let childIdx = 0; childIdx < loopInfos.length; childIdx += 1) {
    const child = loopInfos[childIdx];
    if (child.points.length < 3 || child.area === 0) continue;
    let bestParent = -1;
    for (let parentIdx = 0; parentIdx < loopInfos.length; parentIdx += 1) {
      if (childIdx === parentIdx) continue;
      const parentLoop = loopInfos[parentIdx];
      if (parentLoop.area <= child.area) continue;
      if (parentLoop.points.length < 3) continue;
      const containsChild = child.points.every((point) =>
        pointInPolygon(point, parentLoop.points, STACK_TOLERANCE),
      );
      if (!containsChild) continue;
      if (bestParent === -1 || loopInfos[parentIdx].area < loopInfos[bestParent].area) {
        bestParent = parentIdx;
      }
    }
    parents[childIdx] = bestParent;
  }

  const depth = new Array(loopInfos.length).fill(-1);
  const computeDepth = (idx: number): number => {
    if (depth[idx] !== -1) return depth[idx];
    if (parents[idx] === -1) {
      depth[idx] = 0;
      return 0;
    }
    depth[idx] = computeDepth(parents[idx]) + 1;
    return depth[idx];
  };

  for (let i = 0; i < loopInfos.length; i += 1) {
    depth[i] = computeDepth(i);
  }

  const AREA_THRESHOLD = 50; // pixels^2; prevents accidental noise from rendering
  const areas: ClosedLoop[] = [];

  loopInfos.forEach((loop, idx) => {
    if (loop.points.length < 3) return;
    if (depth[idx] % 2 !== 0) return;

    const boundary: LoopRing = {
      nodeIds: loop.cycle,
      points: loop.points,
      area: loop.area,
    };

    const holeRings: LoopRing[] = loopInfos
      .map((candidate, candidateIdx) => ({ candidate, candidateIdx }))
      .filter(
        ({ candidateIdx }) =>
          parents[candidateIdx] === idx && depth[candidateIdx] % 2 === 1,
      )
      .map(({ candidate }) => ({
        nodeIds: candidate.cycle,
        points: candidate.points,
        area: candidate.area,
      }));

    const netArea = Math.max(
      boundary.area - holeRings.reduce((sum, ring) => sum + ring.area, 0),
      0,
    );

    if (netArea < AREA_THRESHOLD) return;

    areas.push({ boundary, holes: holeRings, netArea });
  });

  return areas;
};
