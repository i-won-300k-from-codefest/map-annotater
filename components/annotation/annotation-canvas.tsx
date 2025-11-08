"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import type { Edge, Position, Vertex } from "@/lib/types";
import type { AnnotatedFeature, AnnotationTool } from "@/lib/annotation";
import { findClosedLoops, type ClosedLoop } from "@/lib/graph";
import type { ZoomState } from "./zoom-controls";

/**
 * Cursor position expressed as pixel coordinates relative to the image.
 */
export interface CursorInfo {
  relative: Position;
  absolute: Position;
}

interface AnnotationCanvasProps {
  imageSrc: string | null;
  imageSize: [number, number];
  nodes: Vertex[];
  edges: Edge[];
  features: AnnotatedFeature[];
  activeTool: AnnotationTool;
  pendingEdgeStart: string | null;
  onPendingEdgeChange: (nodeId: string | null) => void;
  onAddNode: (position: Position) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onPlaceFeature: (position: Position) => void;
  onUpdateNode: (nodeId: string, position: Position) => void;
  onUpdateFeature: (featureId: string, position: Position) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteFeature: (featureId: string) => void;
  onCursorChange: (cursor: CursorInfo | null) => void;
  zoom: ZoomState;
  onZoomChange: (zoom: ZoomState) => void;
}

type SelectedElement =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "feature"; id: string }
  | null;

const featureStyles: Record<AnnotatedFeature["type"], string> = {
  shop: "border-emerald-500 bg-emerald-500/90 text-white",
  restaurant: "border-amber-500 bg-amber-500/90 text-slate-900",
  entrance: "border-sky-500 bg-sky-500/90 text-white",
  restroom: "border-violet-500 bg-violet-500/90 text-white",
};

const pointToSegmentDistance = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const closestX = start.x + clampedT * dx;
  const closestY = start.y + clampedT * dy;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const pathFromRings = (rings: { x: number; y: number }[][]) => {
  return rings
    .map((ring) => {
      if (ring.length < 3) return "";
      const [first, ...rest] = ring;
      const commands = rest.map((point) => `L ${point.x} ${point.y}`).join(" ");
      return `M ${first.x} ${first.y} ${commands} Z`;
    })
    .filter(Boolean)
    .join(" ");
};

export function AnnotationCanvas(props: AnnotationCanvasProps) {
  const {
    imageSrc,
    imageSize,
    nodes,
    edges,
    features,
    activeTool,
    pendingEdgeStart,
    onPendingEdgeChange,
    onAddNode,
    onConnectNodes,
    onPlaceFeature,
    onUpdateNode,
    onUpdateFeature,
    onDeleteNode,
    onDeleteEdge,
    onDeleteFeature,
    onCursorChange,
    zoom,
    onZoomChange,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const closedAreas = useMemo<ClosedLoop[]>(
    () => findClosedLoops(nodes, edges),
    [nodes, edges],
  );

  const deleteSelectedElement = useCallback(() => {
    if (!selectedElement) return;
    if (selectedElement.type === "node") {
      onDeleteNode(selectedElement.id);
    } else if (selectedElement.type === "edge") {
      onDeleteEdge(selectedElement.id);
    } else if (selectedElement.type === "feature") {
      onDeleteFeature(selectedElement.id);
    }
    setSelectedElement(null);
    setIsDragging(false);
    setDragStartPos(null);
  }, [onDeleteEdge, onDeleteFeature, onDeleteNode, selectedElement]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard event listeners for space key (panning) and delete shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept space if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        deleteSelectedElement();
        e.preventDefault();
        return;
      }

      if (e.code === "Space" && !e.repeat && !isTyping) {
        setSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [deleteSelectedElement]);

  const projectPosition = useCallback(
    (position: Position) => {
      // Position is stored as pixel coordinates relative to original image dimensions
      // Scale to container's actual display dimensions for rendering
      if (!imageSize[0] || !imageSize[1]) {
        return { x: 0, y: 0 };
      }
      return {
        x: (position[0] / imageSize[0]) * dimensions.width,
        y: (position[1] / imageSize[1]) * dimensions.height,
      };
    },
    [dimensions.width, dimensions.height, imageSize],
  );

  const getRelativeFromEvent = useCallback(
    (event: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !imageSize[0] || !imageSize[1]) return null;

      // Get raw client coordinates relative to container
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      // Account for zoom and pan to get normalized 0-1 position
      const normalizedX = (clientX - zoom.offsetX) / (rect.width * zoom.scale);
      const normalizedY = (clientY - zoom.offsetY) / (rect.height * zoom.scale);

      if (Number.isNaN(normalizedX) || Number.isNaN(normalizedY)) return null;
      if (
        normalizedX < 0 ||
        normalizedX > 1 ||
        normalizedY < 0 ||
        normalizedY > 1
      )
        return null;

      // Convert to pixel coordinates based on image dimensions
      const pixelX = Math.round(normalizedX * imageSize[0]);
      const pixelY = Math.round(normalizedY * imageSize[1]);

      return {
        relative: [pixelX, pixelY] as Position,
        absolute: [pixelX, pixelY] as Position,
      } satisfies CursorInfo;
    },
    [zoom.offsetX, zoom.offsetY, zoom.scale, imageSize],
  );

  const findNodeHit = useCallback(
    (position: Position) => {
      if (!dimensions.width || !dimensions.height) return null;
      const click = projectPosition(position);
      const threshold = 18;
      let hit: string | null = null;
      let shortest = Number.POSITIVE_INFINITY;
      nodes.forEach((node) => {
        const nodePoint = projectPosition(node.position);
        const distance = Math.hypot(
          nodePoint.x - click.x,
          nodePoint.y - click.y,
        );
        if (distance < threshold && distance < shortest) {
          hit = node.id;
          shortest = distance;
        }
      });
      return hit;
    },
    [dimensions.height, dimensions.width, nodes, projectPosition],
  );

  const findFeatureHit = useCallback(
    (position: Position) => {
      if (!dimensions.width || !dimensions.height) return null;
      const click = projectPosition(position);
      const threshold = 25;
      let hit: string | null = null;
      let shortest = Number.POSITIVE_INFINITY;
      features.forEach((feature) => {
        const featurePoint = projectPosition(feature.position);
        const distance = Math.hypot(
          featurePoint.x - click.x,
          featurePoint.y - click.y,
        );
        if (distance < threshold && distance < shortest) {
          hit = feature.id;
          shortest = distance;
        }
      });
      return hit;
    },
    [dimensions.height, dimensions.width, features, projectPosition],
  );

  const findEdgeHit = useCallback(
    (position: Position) => {
      if (!dimensions.width || !dimensions.height) return null;
      const click = projectPosition(position);
      const threshold = 12;
      let hit: string | null = null;
      let shortest = Number.POSITIVE_INFINITY;

      edges.forEach((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return;
        const start = projectPosition(source.position);
        const end = projectPosition(target.position);
        const distance = pointToSegmentDistance(click, start, end);
        if (distance < threshold && distance < shortest) {
          hit = edge.id;
          shortest = distance;
        }
      });

      return hit;
    },
    [dimensions.height, dimensions.width, edges, nodes, projectPosition],
  );

  const findElementHit = useCallback(
    (position: Position): SelectedElement => {
      // Check features first (they're rendered on top)
      const featureId = findFeatureHit(position);
      if (featureId) {
        return { type: "feature", id: featureId };
      }
      // Then check nodes
      const nodeId = findNodeHit(position);
      if (nodeId) {
        return { type: "node", id: nodeId };
      }
      const edgeId = findEdgeHit(position);
      if (edgeId) {
        return { type: "edge", id: edgeId };
      }
      return null;
    },
    [findEdgeHit, findFeatureHit, findNodeHit],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!containerRef.current) return;

      event.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Zoom factor
      const delta = -event.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(10, zoom.scale * zoomFactor));

      // Calculate new offsets to zoom towards mouse position
      const newOffsetX =
        mouseX - (mouseX - zoom.offsetX) * (newScale / zoom.scale);
      const newOffsetY =
        mouseY - (mouseY - zoom.offsetY) * (newScale / zoom.scale);

      onZoomChange({
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    },
    [zoom, onZoomChange],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      const info = getRelativeFromEvent(event);

      // In select mode, check if clicking on an element
      if (activeTool === "select" && info) {
        const hitElement = findElementHit(info.relative);
        if (hitElement) {
          // Start dragging the element
          setSelectedElement(hitElement);
          if (hitElement.type === "node" || hitElement.type === "feature") {
            setIsDragging(true);
            setDragStartPos(info.relative);
          } else {
            setIsDragging(false);
            setDragStartPos(null);
          }
          event.preventDefault();
          return;
        }
        // Clicking on empty space - deselect and allow panning
        setSelectedElement(null);
      }

      // Handle panning
      if (spacePressed || activeTool === "select") {
        setIsPanning(true);
        setPanStart({
          x: event.clientX - zoom.offsetX,
          y: event.clientY - zoom.offsetY,
        });
        event.preventDefault();
      }
    },
    [
      spacePressed,
      activeTool,
      zoom.offsetX,
      zoom.offsetY,
      getRelativeFromEvent,
      findElementHit,
    ],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      // Handle element dragging
      if (isDragging && selectedElement && dragStartPos) {
        const info = getRelativeFromEvent(event);
        if (info) {
          const newPosition = info.relative;
          if (selectedElement.type === "node") {
            onUpdateNode(selectedElement.id, newPosition);
          } else if (selectedElement.type === "feature") {
            onUpdateFeature(selectedElement.id, newPosition);
          }
          setDragStartPos(newPosition);
        }
        return;
      }

      // Handle panning
      if (isPanning) {
        const newOffsetX = event.clientX - panStart.x;
        const newOffsetY = event.clientY - panStart.y;
        onZoomChange({
          ...zoom,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        });
      }
    },
    [
      isDragging,
      selectedElement,
      dragStartPos,
      isPanning,
      panStart,
      zoom,
      onZoomChange,
      getRelativeFromEvent,
      onUpdateNode,
      onUpdateFeature,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
    setDragStartPos(null);
  }, []);

  const handlePointerMove = (event: React.MouseEvent) => {
    handleMouseMove(event);
    const shouldTrackHover =
      activeTool === "add-edge" || activeTool === "select";

    if (!isPanning) {
      const info = getRelativeFromEvent(event);
      onCursorChange(info);

      if (!isDragging && shouldTrackHover && info) {
        const hitNode = findNodeHit(info.relative);
        setHoveredNodeId((prev) => (prev === hitNode ? prev : hitNode));
      } else if (hoveredNodeId) {
        setHoveredNodeId(null);
      }
    } else if (hoveredNodeId) {
      setHoveredNodeId(null);
    }
  };

  const handlePointerLeave = () => {
    onCursorChange(null);
    setIsPanning(false);
    setIsDragging(false);
    setDragStartPos(null);
    setHoveredNodeId(null);
  };

  const handleClick = (event: React.MouseEvent) => {
    // Don't handle clicks when panning or space is pressed
    if (isPanning || spacePressed) return;

    if (!imageSrc) return;
    const info = getRelativeFromEvent(event);
    if (!info) return;

    if (activeTool === "add-node") {
      onAddNode(info.relative);
      return;
    }

    if (activeTool === "add-edge") {
      const hit = findNodeHit(info.relative);
      if (!hit) {
        onPendingEdgeChange(null);
        return;
      }
      if (!pendingEdgeStart) {
        onPendingEdgeChange(hit);
      } else if (pendingEdgeStart === hit) {
        onPendingEdgeChange(null);
      } else {
        onConnectNodes(pendingEdgeStart, hit);
        onPendingEdgeChange(null);
      }
      return;
    }

    if (activeTool.startsWith("feature")) {
      onPlaceFeature(info.relative);
      return;
    }
  };

  const renderEdges = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    return edges.map((edge) => {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);
      if (!source || !target) return null;
      const { x: x1, y: y1 } = projectPosition(source.position);
      const { x: x2, y: y2 } = projectPosition(target.position);
      const isSelected =
        selectedElement?.type === "edge" && selectedElement.id === edge.id;
      return (
        <line
          key={edge.id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isSelected ? "var(--destructive)" : "var(--primary)"}
          strokeWidth={isSelected ? 3 : 2}
          strokeLinecap="round"
          opacity={isSelected ? 1 : 0.85}
        />
      );
    });
  }, [
    dimensions.height,
    dimensions.width,
    edges,
    nodes,
    projectPosition,
    selectedElement,
  ]);

  const renderAreas = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    if (!closedAreas.length) return null;

    return closedAreas
      .map((area) => {
        const boundaryPoints = area.boundary.points.map((position) =>
          projectPosition(position),
        );
        if (boundaryPoints.length < 3) return null;

        const holeRings = area.holes
          .map((hole) =>
            hole.points.map((position) => projectPosition(position)),
          )
          .filter((ring) => ring.length >= 3);

        const pathData = pathFromRings([boundaryPoints, ...holeRings]);
        if (!pathData) return null;

        return (
          <path
            key={`area-${area.boundary.nodeIds.join("-")}`}
            d={pathData}
            fillRule="evenodd"
            fill="var(--primary)"
            fillOpacity={0.15}
            stroke="var(--primary)"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        );
      })
      .filter((polygon): polygon is ReactElement => Boolean(polygon));
  }, [closedAreas, dimensions.height, dimensions.width, projectPosition]);

  const cursorStyle = isDragging
    ? "grabbing"
    : isPanning || spacePressed
      ? "grabbing"
      : activeTool === "select"
        ? "default"
        : "crosshair";

  return (
    <div className="relative flex-1 h-full">
      <div
        ref={containerRef}
        className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border bg-muted"
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        style={{ cursor: cursorStyle }}
      >
        <div
          ref={contentRef}
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${zoom.offsetX}px, ${zoom.offsetY}px) scale(${zoom.scale})`,
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt="Area base"
              fill
              unoptimized
              priority={false}
              draggable={false}
              className="pointer-events-none select-none object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Upload an image to start annotating.
            </div>
          )}

          {imageSrc ? (
            <>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {renderAreas}
                {renderEdges}
              </svg>
              {nodes.map((node) => {
                const isActive = pendingEdgeStart === node.id;
                const isSelected =
                  selectedElement?.type === "node" &&
                  selectedElement.id === node.id;
                const isHoverCandidate =
                  hoveredNodeId === node.id &&
                  (activeTool === "add-edge" || activeTool === "select");
                // Convert pixel position to percentage for CSS
                const leftPercent =
                  imageSize[0] > 0
                    ? (node.position[0] / imageSize[0]) * 100
                    : 0;
                const topPercent =
                  imageSize[1] > 0
                    ? (node.position[1] / imageSize[1]) * 100
                    : 0;

                // Use consistent small size
                const nodeSize = 4;

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary ring-2 ring-primary/50"
                        : isActive
                          ? "border-primary bg-primary/80"
                          : isHoverCandidate
                            ? "border-primary/70 bg-primary/30 ring-1 ring-primary/40"
                            : "border-muted-foreground/40 bg-muted-foreground/60 hover:border-primary/50"
                    } ${activeTool === "select" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: nodeSize,
                      height: nodeSize,
                    }}
                  >
                    <span className="sr-only">{node.id}</span>
                  </button>
                );
              })}
              {features.map((feature) => {
                const isSelected =
                  selectedElement?.type === "feature" &&
                  selectedElement.id === feature.id;
                // Convert pixel position to percentage for CSS
                const leftPercent =
                  imageSize[0] > 0
                    ? (feature.position[0] / imageSize[0]) * 100
                    : 0;
                const topPercent =
                  imageSize[1] > 0
                    ? (feature.position[1] / imageSize[1]) * 100
                    : 0;
                const featureStyle = featureStyles[feature.type];

                return (
                  <div
                    key={feature.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1 py-0.5 text-[9px] font-medium leading-none shadow transition-all ${
                      isSelected
                        ? "ring-2 ring-primary/60 scale-110"
                        : "hover:scale-105"
                    } ${featureStyle} ${activeTool === "select" ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                    }}
                  >
                    {feature.type === "entrance" || feature.type === "restroom"
                      ? feature.label
                      : feature.name}
                  </div>
                );
              })}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
