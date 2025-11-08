"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Position, Vertex } from "@/lib/types";
import type { AnnotatedFeature, AnnotationTool } from "@/lib/annotation";

export interface CursorInfo {
  relative: Position;
  absolute: Position;
}

interface AnnotationCanvasProps {
  imageSrc: string | null;
  nodes: Vertex[];
  edges: Edge[];
  features: AnnotatedFeature[];
  activeTool: AnnotationTool;
  pendingEdgeStart: string | null;
  onPendingEdgeChange: (nodeId: string | null) => void;
  onAddNode: (position: Position) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onPlaceFeature: (position: Position) => void;
  onCursorChange: (cursor: CursorInfo | null) => void;
}

export function AnnotationCanvas(props: AnnotationCanvasProps) {
  const {
    imageSrc,
    nodes,
    edges,
    features,
    activeTool,
    pendingEdgeStart,
    onPendingEdgeChange,
    onAddNode,
    onConnectNodes,
    onPlaceFeature,
    onCursorChange,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const projectPosition = useCallback(
    (position: Position) => ({
      x: position[0] * dimensions.width,
      y: position[1] * dimensions.height,
    }),
    [dimensions.height, dimensions.width],
  );

  const getRelativeFromEvent = useCallback(
    (event: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return {
        relative: [x, y] as Position,
        absolute: [x * rect.width, y * rect.height] as Position,
      } satisfies CursorInfo;
    },
    [],
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
        const distance = Math.hypot(nodePoint.x - click.x, nodePoint.y - click.y);
        if (distance < threshold && distance < shortest) {
          hit = node.id;
          shortest = distance;
        }
      });
      return hit;
    },
    [dimensions.height, dimensions.width, nodes, projectPosition],
  );

  const handlePointerMove = (event: React.MouseEvent) => {
    const info = getRelativeFromEvent(event);
    onCursorChange(info);
  };

  const handlePointerLeave = () => onCursorChange(null);

  const handleClick = (event: React.MouseEvent) => {
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
      return (
        <line
          key={edge.id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.85}
        />
      );
    });
  }, [dimensions.height, dimensions.width, edges, nodes, projectPosition]);

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border bg-muted"
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onClick={handleClick}
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
              {renderEdges}
            </svg>
            {nodes.map((node) => {
              const isActive = pendingEdgeStart === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${isActive ? "border-primary bg-primary/80" : "border-background bg-card"}`}
                  style={{
                    left: `${node.position[0] * 100}%`,
                    top: `${node.position[1] * 100}%`,
                    width: isActive ? 14 : 12,
                    height: isActive ? 14 : 12,
                  }}
                >
                  <span className="sr-only">{node.id}</span>
                </button>
              );
            })}
            {features.map((feature) => (
              <div
                key={feature.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground shadow"
                style={{
                  left: `${feature.position[0] * 100}%`,
                  top: `${feature.position[1] * 100}%`,
                }}
              >
                {feature.type === "entrance"
                  ? feature.label || "Entrance"
                  : feature.name}
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
