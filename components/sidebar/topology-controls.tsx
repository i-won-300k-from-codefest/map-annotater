"use client";

import { CirclePlus, GitBranch, MousePointer2, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnnotationTool } from "@/lib/annotation";

interface TopologyControlsProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  pendingEdgeStart: string | null;
  nodeCount: number;
  edgeCount: number;
}

export function TopologyControls({
  activeTool,
  onToolChange,
  pendingEdgeStart,
  nodeCount,
  edgeCount,
}: TopologyControlsProps) {
  const buttonVariant = (tool: AnnotationTool): "default" | "secondary" =>
    activeTool === tool ? "default" : "secondary";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Network className="h-4 w-4" /> Topology tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={buttonVariant("select")}
            onClick={() => onToolChange("select")}
          >
            <MousePointer2 className="mr-2 h-4 w-4" /> Select
          </Button>
          <Button
            size="sm"
            variant={buttonVariant("add-node")}
            onClick={() => onToolChange("add-node")}
          >
            <CirclePlus className="mr-2 h-4 w-4" /> Add vertex
          </Button>
          <Button
            size="sm"
            variant={buttonVariant("add-edge")}
            onClick={() => onToolChange("add-edge")}
          >
            <GitBranch className="mr-2 h-4 w-4" /> Connect edge
          </Button>
        </div>
        <p className="text-muted-foreground">
          Click anywhere on the base image to drop vertices. Use connect edge
          to click two existing vertices and form paths between them.
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary">{nodeCount} vertices</Badge>
          <Badge variant="secondary">{edgeCount} edges</Badge>
          {pendingEdgeStart ? (
            <span className="text-primary">
              Edge start locked on <strong>{pendingEdgeStart}</strong>
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
