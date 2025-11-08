"use client";

import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ZoomControlsProps {
  zoom: ZoomState;
  onZoomChange: (zoom: ZoomState) => void;
  disabled?: boolean;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.2;

export function ZoomControls({ zoom, onZoomChange, disabled = false }: ZoomControlsProps) {
  const handleZoomIn = () => {
    const newScale = Math.min(zoom.scale + ZOOM_STEP, MAX_ZOOM);
    onZoomChange({ ...zoom, scale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(zoom.scale - ZOOM_STEP, MIN_ZOOM);
    onZoomChange({ ...zoom, scale: newScale });
  };

  const handleReset = () => {
    onZoomChange({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  const handleFitToView = () => {
    onZoomChange({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  const canZoomIn = zoom.scale < MAX_ZOOM;
  const canZoomOut = zoom.scale > MIN_ZOOM;
  const isModified = zoom.scale !== 1 || zoom.offsetX !== 0 || zoom.offsetY !== 0;

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        disabled={disabled || !canZoomOut}
        className="h-8 w-8"
        title="Zoom out (Ctrl+-)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <div className="flex min-w-[60px] items-center justify-center px-2 text-xs font-medium tabular-nums">
        {Math.round(zoom.scale * 100)}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        disabled={disabled || !canZoomIn}
        className="h-8 w-8"
        title="Zoom in (Ctrl++)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFitToView}
        disabled={disabled}
        className="h-8 w-8"
        title="Fit to view"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        disabled={disabled || !isModified}
        className="h-8 w-8"
        title="Reset zoom and pan"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
