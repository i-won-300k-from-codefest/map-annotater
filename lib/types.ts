/**
 * Coordinate pair stored as integers representing pixel positions.
 *
 * @example
 * const center: Position = [500, 300]; // Center at pixel (500, 300)
 * const topLeft: Position = [0, 0]; // Top-left corner
 */
export type Position = [number, number];

/**
 * Base interface for primitive geometric elements in the map topology.
 *
 * Primitives form the basic building blocks of the map structure,
 * representing either nodes (vertices) or connections (edges).
 */
interface PrimitiveBase {
  type: "node" | "edge";
}

/**
 * A vertex (node) in the map topology graph.
 *
 * Vertices represent points in the navigable space of a map area.
 * They are connected by edges to form the topology network.
 *
 * @property id - Unique identifier for the vertex
 * @property position - Normalized coordinates on the map canvas
 */
export interface Vertex extends PrimitiveBase {
  type: "node";
  id: string;
  position: Position;
}

/**
 * An edge connecting two vertices in the map topology graph.
 *
 * Edges represent navigable connections between vertices,
 * forming the pathways in the map topology.
 *
 * @property id - Unique identifier for the edge
 * @property source - ID of the source vertex
 * @property target - ID of the target vertex
 */
export interface Edge extends PrimitiveBase {
  type: "edge";
  id: string;
  source: string;
  target: string;
}

/**
 * Union type representing any primitive element in the map topology.
 *
 * A primitive can be either a vertex (node) or an edge connecting vertices.
 */
export type Primitive = Vertex | Edge;

/**
 * Base interface for feature elements on the map.
 *
 * Features represent points of interest or interactive elements
 * that are placed on the map at specific positions.
 */
interface FeatureBase {
  type: "shop" | "restaurant" | "entrance";
  position: Position;
}

/**
 * A shop feature on the map.
 *
 * Represents a retail shop or store location that can be marked
 * and labeled on the map.
 *
 * @property name - Display name of the shop
 */
export interface Shop extends FeatureBase {
  type: "shop";
  name: string;
}

/**
 * A restaurant feature on the map.
 *
 * Represents a dining or food service location that can be marked
 * and labeled on the map.
 *
 * @property name - Display name of the restaurant
 */
export interface Restaurant extends FeatureBase {
  type: "restaurant";
  name: string;
}

/**
 * An entrance feature that connects to another area.
 *
 * Represents a transition point between different areas, such as doors,
 * stairs, elevators, or outdoor exits. Entrances can link to other
 * areas or to the outside.
 *
 * @property label - Display label for the entrance (e.g., "East Exit", "Elevator to Floor 2")
 * @property target - ID of the target area, or empty string for outside connections
 */
export interface Entrance extends FeatureBase {
  type: "entrance";
  label: string;
  target: string;
}

/**
 * Union type representing any feature element on the map.
 *
 * A feature can be a shop, restaurant, or entrance to another area.
 */
export type Feature = Shop | Restaurant | Entrance;

/**
 * An area on the map representing a distinct spatial region.
 *
 * Areas can represent floors in a building, separate buildings,
 * underground shopping malls, or any other logically distinct region
 * that requires its own topology and feature set.
 *
 * @property id - Unique identifier for the area
 * @property name - Display name of the area
 * @property descriptions - Array of descriptive text about the area
 * @property size - Canvas dimensions as [width, height] in pixels
 * @property topology - Collection of vertices and edges forming the navigable structure
 * @property features - Collection of points of interest within the area
 */
export interface Area {
  id: string;
  name: string;
  descriptions: string[];
  size: [number, number];
  topology: Primitive[];
  features: Feature[];
}
