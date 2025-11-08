/**
 * Normalized coordinate pair stored as raw numbers (0–1 range, not percentages).
 */
type Position = [number, number];

interface PrimitiveBase {
  type: "node" | "edge";
}

export interface Vertex extends PrimitiveBase {
  type: "node";
  id: string;
  position: Position;
}

export interface Edge extends PrimitiveBase {
  type: "edge";
  id: string;
  source: string; // source node id
  target: string; // target node id
}

export type Primitive = Vertex | Edge;

interface FeatureBase {
  type: "shop" | "restaurant" | "entrance";
  position: Position;
}

// A shop feature on the map
export interface Shop extends FeatureBase {
  type: "shop";
  name: string;
}

// A restaurant feature on the map
export interface Restaurant extends FeatureBase {
  type: "restaurant";
  name: string;
}

// An entrance feature that connects to another area, like doors, stairs, elevators, etc.
export interface Entrance extends FeatureBase {
  type: "entrance";
  label: string;
  target: string; // target area id, empty for outside
}

export type Feature = Shop | Restaurant | Entrance;

// An area on the map, can be a floor, building, underground shopping mall, etc.
export interface Area {
  id: string;
  name: string;
  descriptions: string[];
  topology: Primitive[];
  features: Feature[];
}
