"use client";

import { DoorOpen, MapPin, Store, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AnnotationTool, FeatureDraft } from "@/lib/annotation";
import { createEmptyDraft } from "@/lib/annotation";
import { ImageManager } from "./image-manager";

interface FeatureControlsProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  draft: FeatureDraft;
  onDraftChange: (draft: FeatureDraft) => void;
  featureCounts: Record<FeatureDraft["type"], number>;
}

const toolMap: Record<FeatureDraft["type"], AnnotationTool> = {
  shop: "feature-shop",
  restaurant: "feature-restaurant",
  entrance: "feature-entrance",
  restroom: "feature-restroom",
};

export function FeatureControls({
  activeTool,
  onToolChange,
  draft,
  onDraftChange,
  featureCounts,
}: FeatureControlsProps) {
  const currentTool = toolMap[draft.type];
  const isArmed = activeTool === currentTool;
  const isReady =
    draft.type === "entrance" || draft.type === "restroom"
      ? Boolean(draft.label.trim())
      : Boolean(draft.name.trim());

  const handleTypeChange = (nextType: FeatureDraft["type"]) => {
    onDraftChange(createEmptyDraft(nextType));
    if (activeTool.startsWith("feature") && nextType !== draft.type) {
      onToolChange("select");
    }
  };

  const handleArm = () => {
    if (!isReady) return;
    onToolChange(currentTool);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Feature tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <Label>Feature type</Label>
          <Select
            value={draft.type}
            onValueChange={(value) =>
              handleTypeChange(value as FeatureDraft["type"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select feature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shop">Shop</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="entrance">Entrance</SelectItem>
              <SelectItem value="restroom">Restroom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {draft.type === "entrance" || draft.type === "restroom" ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="feature-label">Label</Label>
              <Input
                id="feature-label"
                value={draft.label}
                placeholder={
                  draft.type === "entrance"
                    ? "East stairwell"
                    : "Men's restroom"
                }
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    label: event.target.value,
                  })
                }
              />
            </div>
            {draft.type === "entrance" && (
              <div className="space-y-1">
                <Label htmlFor="entrance-target">Target area</Label>
                <Input
                  id="entrance-target"
                  value={draft.target}
                  placeholder="Parking level"
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      target: event.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="feature-name">Name</Label>
            <Input
              id="feature-name"
              value={draft.name}
              placeholder={draft.type === "shop" ? "Bookstore" : "Cafe"}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  name: event.target.value,
                })
              }
            />
          </div>
        )}
        <Separator />
        <ImageManager
          images={draft.images}
          onChange={(images) =>
            onDraftChange({
              ...draft,
              images,
            })
          }
        />
        <Button
          size="sm"
          disabled={!isReady}
          variant={isArmed ? "default" : "secondary"}
          onClick={handleArm}
        >
          {isArmed ? "Placement armed" : "Arm placement"}
        </Button>
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Store className="h-3.5 w-3.5" /> {featureCounts.shop} shops
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <UtensilsCrossed className="h-3.5 w-3.5" />{" "}
            {featureCounts.restaurant} restaurants
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DoorOpen className="h-3.5 w-3.5" /> {featureCounts.entrance}{" "}
            entrances
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Arm a feature type, then click the map to drop the pin. Details from
          this form will be applied automatically.
        </p>
      </CardContent>
    </Card>
  );
}
