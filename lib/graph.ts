import type { Edge, Vertex } from "@/lib/types";

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

export const findClosedLoops = (nodes: Vertex[], edges: Edge[]): string[][] => {
  if (nodes.length < 3 || edges.length < 3) {
    return [] as string[][];
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
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

  return cycles;
};

export type ClosedLoop = ReturnType<typeof findClosedLoops>[number];
