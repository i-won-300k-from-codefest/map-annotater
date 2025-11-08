"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnnotationMode, AnnotationTool, AnnotatedFeature, FeatureDraft } from "@/lib/annotation";
import type { Edge, Vertex } from "@/lib/types";
import { UploadPanel } from "./upload-panel";
import { TopologyControls } from "./topology-controls";
import { FeatureControls } from "./feature-controls";
import { AnnotationList } from "./annotation-list";

interface AnnotationSidebarProps {
  imageSrc: string | null;
  onUploadImage: (file: File) => void;
  onClearImage: () => void;
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  pendingEdgeStart: string | null;
  featureDraft: FeatureDraft;
  onFeatureDraftChange: (draft: FeatureDraft) => void;
  nodes: Vertex[];
  edges: Edge[];
  features: AnnotatedFeature[];
  onUpdateNode: (originalId: string, node: Vertex) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (originalId: string, edge: Edge) => void;
  onDeleteEdge: (id: string) => void;
  onUpdateFeature: (originalId: string, feature: AnnotatedFeature) => void;
  onDeleteFeature: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function AnnotationSidebar(props: AnnotationSidebarProps) {
  const {
    imageSrc,
    onUploadImage,
    onClearImage,
    mode,
    onModeChange,
    activeTool,
    onToolChange,
    pendingEdgeStart,
    featureDraft,
    onFeatureDraftChange,
    nodes,
    edges,
    features,
    onUpdateNode,
    onDeleteNode,
    onUpdateEdge,
    onDeleteEdge,
    onUpdateFeature,
    onDeleteFeature,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  } = props;

  const featureCounts = features.reduce<Record<FeatureDraft["type"], number>>(
    (acc, feature) => {
      acc[feature.type] = (acc[feature.type] ?? 0) + 1;
      return acc;
    },
    { shop: 0, restaurant: 0, entrance: 0 },
  );

  return (
    <aside className="flex h-full w-full max-w-md flex-col gap-6 border-r bg-card p-6">
      <UploadPanel imageSrc={imageSrc} onUpload={onUploadImage} onClear={onClearImage} />
      <Tabs value={mode} onValueChange={(value) => onModeChange(value as AnnotationMode)} className="space-y-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="topology">Topology</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
        <TabsContent value="topology" className="space-y-4">
          <TopologyControls
            activeTool={activeTool}
            onToolChange={onToolChange}
            pendingEdgeStart={pendingEdgeStart}
            nodeCount={nodes.length}
            edgeCount={edges.length}
          />
        </TabsContent>
        <TabsContent value="features" className="space-y-4">
          <FeatureControls
            activeTool={activeTool}
            onToolChange={onToolChange}
            draft={featureDraft}
            onDraftChange={onFeatureDraftChange}
            featureCounts={featureCounts}
          />
        </TabsContent>
      </Tabs>
      <div className="flex-1">
        <AnnotationList
          nodes={nodes}
          edges={edges}
          features={features}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
          onUpdateFeature={onUpdateFeature}
          onDeleteFeature={onDeleteFeature}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    </aside>
  );
}
