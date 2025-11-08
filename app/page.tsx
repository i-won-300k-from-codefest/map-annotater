"use client";

import { useCallback, useState } from "react";
import { AnnotationSidebar } from "@/components/sidebar/annotation-sidebar";
import { AnnotationToolbar } from "@/components/annotation/annotation-toolbar";
import {
  AnnotationCanvas,
  type CursorInfo,
} from "@/components/annotation/annotation-canvas";
import {
  ZoomControls,
  type ZoomState,
} from "@/components/annotation/zoom-controls";
import { useAnnotationHistory } from "@/hooks/use-annotation-history";
import type { Area, Edge, Feature, Position, Vertex } from "@/lib/types";
import {
  createEmptyDraft,
  featureToolFromType,
  isFeatureTool,
  type AnnotatedFeature,
  type AnnotationMode,
  type AnnotationTool,
  type FeatureDraft,
} from "@/lib/annotation";
import { generateId } from "@/lib/utils";

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<[number, number]>([0, 0]);
  const [mode, setMode] = useState<AnnotationMode>("topology");
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [pendingEdgeStart, setPendingEdgeStart] = useState<string | null>(null);
  const [featureDraft, setFeatureDraft] = useState<FeatureDraft>(
    createEmptyDraft("shop"),
  );
  const [cursor, setCursor] = useState<CursorInfo | null>(null);
  const [zoom, setZoom] = useState<ZoomState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const { state, commit, undo, redo, canRedo, canUndo } =
    useAnnotationHistory();

  const nodes = state.nodes;
  const edges = state.edges;
  const features = state.features;

  const handleToolChange = useCallback((tool: AnnotationTool) => {
    if (tool === "add-node" || tool === "add-edge") {
      setMode("topology");
    } else if (isFeatureTool(tool)) {
      setMode("features");
    }
    if (tool !== "add-edge") {
      setPendingEdgeStart(null);
    }
    setActiveTool(tool);
  }, []);

  const handleModeChange = useCallback(
    (nextMode: AnnotationMode) => {
      setMode(nextMode);
      setActiveTool((current) => {
        if (nextMode === "topology" && isFeatureTool(current)) {
          return "select";
        }
        if (
          nextMode === "features" &&
          (current === "add-node" || current === "add-edge")
        ) {
          return featureToolFromType(featureDraft.type);
        }
        return current;
      });
      if (nextMode !== "topology") {
        setPendingEdgeStart(null);
      }
    },
    [featureDraft.type],
  );

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImageSrc(result);

      // Load image to get dimensions
      if (result) {
        const img = new Image();
        img.onload = () => {
          setImageSize([img.width, img.height]);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddNode = useCallback(
    (position: Position) => {
      commit((prev) => ({
        ...prev,
        nodes: [
          ...prev.nodes,
          {
            type: "node",
            id: generateId("v"),
            position,
          },
        ],
      }));
    },
    [commit],
  );

  const handleConnectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      commit((prev) => {
        const duplicate = prev.edges.some(
          (edge) =>
            (edge.source === sourceId && edge.target === targetId) ||
            (edge.source === targetId && edge.target === sourceId),
        );
        if (duplicate) {
          return prev;
        }
        return {
          ...prev,
          edges: [
            ...prev.edges,
            {
              type: "edge",
              id: generateId("e"),
              source: sourceId,
              target: targetId,
            },
          ],
        };
      });
    },
    [commit],
  );

  const handlePlaceFeature = useCallback(
    (position: Position) => {
      if (
        featureDraft.type === "entrance" ||
        featureDraft.type === "restroom"
      ) {
        if (!featureDraft.label.trim()) return;
      } else if (!featureDraft.name.trim()) {
        return;
      }

      const base: AnnotatedFeature =
        featureDraft.type === "entrance"
          ? {
              id: generateId("f"),
              type: "entrance",
              label: featureDraft.label.trim(),
              target: featureDraft.target.trim(),
              position,
              images: featureDraft.images,
            }
          : featureDraft.type === "restroom"
            ? {
                id: generateId("f"),
                type: "restroom",
                label: featureDraft.label.trim(),
                position,
                images: featureDraft.images,
              }
            : {
                id: generateId("f"),
                type: featureDraft.type,
                name: featureDraft.name.trim(),
                position,
                images: featureDraft.images,
              };

      commit((prev) => ({
        ...prev,
        features: [...prev.features, base],
      }));
    },
    [commit, featureDraft],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((node) => node.id !== id),
        edges: prev.edges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        ),
      }));
      if (pendingEdgeStart === id) {
        setPendingEdgeStart(null);
      }
    },
    [commit, pendingEdgeStart],
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== id),
      }));
    },
    [commit],
  );

  const handleDeleteFeature = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        features: prev.features.filter((feature) => feature.id !== id),
      }));
    },
    [commit],
  );

  const handleUpdateNodePosition = useCallback(
    (nodeId: string, position: Position) => {
      commit((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) =>
          node.id === nodeId ? { ...node, position } : node,
        ),
      }));
    },
    [commit],
  );

  const handleUpdateNode = useCallback(
    (originalId: string, next: Vertex) => {
      const nextId = next.id.trim() || originalId;
      commit((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) =>
          node.id === originalId ? { ...next, id: nextId, type: "node" } : node,
        ),
        edges: prev.edges.map((edge) => ({
          ...edge,
          source: edge.source === originalId ? nextId : edge.source,
          target: edge.target === originalId ? nextId : edge.target,
        })),
      }));
    },
    [commit],
  );

  const handleUpdateEdge = useCallback(
    (originalId: string, next: Edge) => {
      commit((prev) => ({
        ...prev,
        edges: prev.edges.map((edge) =>
          edge.id === originalId
            ? {
                ...next,
                id: next.id.trim() || originalId,
                type: "edge",
              }
            : edge,
        ),
      }));
    },
    [commit],
  );

  const handleUpdateFeaturePosition = useCallback(
    (featureId: string, position: Position) => {
      commit((prev) => ({
        ...prev,
        features: prev.features.map((feature) =>
          feature.id === featureId ? { ...feature, position } : feature,
        ),
      }));
    },
    [commit],
  );

  const handleUpdateFeature = useCallback(
    (originalId: string, next: AnnotatedFeature) => {
      commit((prev) => ({
        ...prev,
        features: prev.features.map((feature) =>
          feature.id === originalId
            ? {
                ...feature,
                ...next,
                id: originalId,
              }
            : feature,
        ),
      }));
    },
    [commit],
  );

  const handleExport = useCallback(() => {
    // Combine nodes and edges into topology array
    const topology = [...nodes, ...edges];

    // Remove id from features to match Feature type (not AnnotatedFeature)
    const featuresWithoutId = features.map(({ id, ...feature }) => feature);

    const area: Area = {
      id: "",
      name: "",
      descriptions: [],
      size: imageSize,
      topology,
      features: featuresWithoutId,
    };

    const blob = new Blob([JSON.stringify(area, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `area-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges, features, imageSize]);

  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result;
          if (typeof content !== "string") {
            throw new Error("Invalid file content");
          }

          const area = JSON.parse(content) as Area;

          // Validate the Area structure
          if (!area || typeof area !== "object") {
            throw new Error("Invalid JSON structure");
          }

          if (!Array.isArray(area.topology) || !Array.isArray(area.features)) {
            throw new Error(
              "Invalid Area structure: missing topology or features",
            );
          }

          // Set image size from imported area
          if (area.size && Array.isArray(area.size) && area.size.length === 2) {
            setImageSize(area.size as [number, number]);
          }

          // Separate nodes and edges from topology array
          const importedNodes = area.topology.filter(
            (p): p is Vertex => p.type === "node",
          );
          const importedEdges = area.topology.filter(
            (p): p is Edge => p.type === "edge",
          );

          // Add IDs to features for AnnotatedFeature type
          const importedFeatures: AnnotatedFeature[] = area.features.map(
            (feature) => ({
              ...feature,
              id: generateId("f"),
            }),
          );

          // Replace current state with imported data
          commit(() => ({
            nodes: importedNodes,
            edges: importedEdges,
            features: importedFeatures,
          }));
        } catch (error) {
          console.error("Failed to import data:", error);
          alert(
            "Failed to import data. Please ensure the file is a valid Area JSON file.",
          );
        }
      };
      reader.readAsText(file);
    },
    [commit],
  );

  const canAnnotate = Boolean(imageSrc);

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <AnnotationSidebar
        imageSrc={imageSrc}
        onUploadImage={handleImageUpload}
        onClearImage={() => setImageSrc(null)}
        mode={mode}
        onModeChange={handleModeChange}
        activeTool={activeTool}
        onToolChange={handleToolChange}
        pendingEdgeStart={pendingEdgeStart}
        featureDraft={featureDraft}
        onFeatureDraftChange={setFeatureDraft}
        nodes={nodes}
        edges={edges}
        features={features}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onUpdateEdge={handleUpdateEdge}
        onDeleteEdge={handleDeleteEdge}
        onUpdateFeature={handleUpdateFeature}
        onDeleteFeature={handleDeleteFeature}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
        onImport={handleImport}
      />
      <section className="flex flex-1 min-h-0 flex-col gap-2 p-2 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-4">
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            cursor={cursor}
            canAnnotate={canAnnotate}
            pendingEdgeStart={pendingEdgeStart}
          />
          <ZoomControls
            zoom={zoom}
            onZoomChange={setZoom}
            disabled={!canAnnotate}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-2">
          <AnnotationCanvas
            imageSrc={imageSrc}
            imageSize={imageSize}
            nodes={nodes}
            edges={edges}
            features={features}
            activeTool={activeTool}
            pendingEdgeStart={pendingEdgeStart}
            onPendingEdgeChange={setPendingEdgeStart}
            onAddNode={handleAddNode}
            onConnectNodes={handleConnectNodes}
            onPlaceFeature={handlePlaceFeature}
            onUpdateNode={handleUpdateNodePosition}
            onUpdateFeature={handleUpdateFeaturePosition}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onDeleteFeature={handleDeleteFeature}
            onCursorChange={setCursor}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </div>
      </section>
    </main>
  );
}
