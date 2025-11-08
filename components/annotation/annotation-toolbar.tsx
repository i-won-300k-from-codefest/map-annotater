"use client";

import { CirclePlus, GitBranch, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AnnotationTool } from "@/lib/annotation";
import type { CursorInfo } from "./annotation-canvas";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  cursor: CursorInfo | null;
  canAnnotate: boolean;
  pendingEdgeStart: string | null;
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  cursor,
  canAnnotate,
  pendingEdgeStart,
}: AnnotationToolbarProps) {
  const formatPosition = (value: number) => value.toFixed(3);
  const toolLabel: Record<AnnotationTool, string> = {
    select: "Select",
    "add-node": "Add vertex",
    "add-edge": "Add edge",
    "feature-shop": "Shop pin",
    "feature-restaurant": "Restaurant pin",
    "feature-entrance": "Entrance pin",
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border bg-white/80 p-4 shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Quick tools</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeTool === "select" ? "default" : "outline"}
            onClick={() => onToolChange("select")}
            disabled={!canAnnotate}
          >
            <MousePointer2 className="mr-2 h-4 w-4" /> Select
          </Button>
          <Button
            size="sm"
            variant={activeTool === "add-node" ? "default" : "outline"}
            onClick={() => onToolChange("add-node")}
            disabled={!canAnnotate}
          >
            <CirclePlus className="mr-2 h-4 w-4" /> Vertex
          </Button>
          <Button
            size="sm"
            variant={activeTool === "add-edge" ? "default" : "outline"}
            onClick={() => onToolChange("add-edge")}
            disabled={!canAnnotate}
          >
            <GitBranch className="mr-2 h-4 w-4" /> Edge
          </Button>
        </div>
      </div>
      <div className="flex flex-col text-sm text-muted-foreground">
        <span>
          Cursor:{" "}
          {cursor ? `${formatPosition(cursor.relative[0])}, ${formatPosition(cursor.relative[1])}` : "--"}
          {pendingEdgeStart ? (
            <span className="ml-3 text-primary">Edge starts at {pendingEdgeStart}</span>
          ) : null}
        </span>
        <span>Active tool: {toolLabel[activeTool]}</span>
        {!canAnnotate ? <span className="text-destructive">Upload an image to unlock drawing tools.</span> : null}
      </div>
    </Card>
  );
}
