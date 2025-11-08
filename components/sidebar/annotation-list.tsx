"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CircleDot,
  GitBranch,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Edge, Vertex } from "@/lib/types";
import type { AnnotatedFeature } from "@/lib/annotation";
import { ImageManager } from "./image-manager";

interface AnnotationListProps {
  nodes: Vertex[];
  edges: Edge[];
  features: AnnotatedFeature[];
  onUpdateNode: (originalId: string, next: Vertex) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (originalId: string, next: Edge) => void;
  onDeleteEdge: (id: string) => void;
  onUpdateFeature: (originalId: string, next: AnnotatedFeature) => void;
  onDeleteFeature: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type EditingItem =
  | { type: "node"; value: Vertex; originalId: string }
  | { type: "edge"; value: Edge; originalId: string }
  | { type: "feature"; value: AnnotatedFeature; originalId: string };

const cloneValue = <T,>(value: T): T => {
  try {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);
  } catch {
    return value;
  }
};

export function AnnotationList(props: AnnotationListProps) {
  const {
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

  const [editing, setEditing] = useState<EditingItem | null>(null);

  const sections = useMemo(
    () => [
      {
        label: "Vertices",
        emptyLabel: "No vertices yet. Drop some in topology mode.",
        icon: <CircleDot className="h-3.5 w-3.5" />,
        items: nodes,
        type: "node" as const,
        onEdit: (item: Vertex) =>
          setEditing({
            type: "node",
            value: cloneValue(item),
            originalId: item.id,
          }),
        onDelete: (item: Vertex) => onDeleteNode(item.id),
        meta: (item: Vertex) =>
          `${Math.round(item.position[0])}, ${Math.round(item.position[1])}`,
      },
      {
        label: "Edges",
        emptyLabel: "No edges yet. Connect two vertices to build paths.",
        icon: <GitBranch className="h-3.5 w-3.5" />,
        items: edges,
        type: "edge" as const,
        onEdit: (item: Edge) =>
          setEditing({
            type: "edge",
            value: cloneValue(item),
            originalId: item.id,
          }),
        onDelete: (item: Edge) => onDeleteEdge(item.id),
        meta: (item: Edge) => `${item.source} -> ${item.target}`,
      },
      {
        label: "Features",
        emptyLabel: "No features yet. Arm a feature tool to drop POIs.",
        icon: <MapPin className="h-3.5 w-3.5" />,
        items: features,
        type: "feature" as const,
        onEdit: (item: AnnotatedFeature) =>
          setEditing({
            type: "feature",
            value: cloneValue(item),
            originalId: item.id,
          }),
        onDelete: (item: AnnotatedFeature) => onDeleteFeature(item.id),
        meta: (item: AnnotatedFeature) =>
          item.type === "entrance" ? item.label || "entrance" : item.name,
      },
    ],
    [edges, features, nodes, onDeleteEdge, onDeleteFeature, onDeleteNode],
  );

  const handleSave = () => {
    if (!editing) return;
    if (editing.type === "node") {
      onUpdateNode(editing.originalId, editing.value);
    } else if (editing.type === "edge") {
      onUpdateEdge(editing.originalId, editing.value);
    } else {
      onUpdateFeature(editing.originalId, editing.value);
    }
    setEditing(null);
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Current annotations
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Review, update, or remove any annotation you have created. Undo and
          redo apply across modes.
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.label} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {section.icon}
                  {section.label}
                  <Badge variant="secondary">{section.items.length}</Badge>
                </div>
                {section.items.length ? (
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const imageCount =
                        section.type === "feature" && "images" in item
                          ? ((item as AnnotatedFeature).images?.length ?? 0)
                          : 0;

                      return (
                        <div
                          key={
                            (item as { id?: string }).id ?? JSON.stringify(item)
                          }
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {"id" in item && item.id
                                  ? item.id
                                  : section.label.slice(0, -1)}
                              </p>
                              {imageCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {imageCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {section.meta(item as never)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => section.onEdit(item as never)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => section.onDelete(item as never)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {section.emptyLabel}
                  </p>
                )}
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(isOpen) => (!isOpen ? setEditing(null) : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editing?.type}</DialogTitle>
          </DialogHeader>
          {editing?.type === "node" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="node-id">Identifier</Label>
                <Input
                  id="node-id"
                  value={editing.value.id}
                  onChange={(event) =>
                    setEditing((current) =>
                      current && current.type === "node"
                        ? {
                            ...current,
                            value: { ...current.value, id: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["x", "y"] as const).map((axis, index) => (
                  <div className="space-y-1" key={axis}>
                    <Label htmlFor={`node-${axis}`}>
                      {axis.toUpperCase()} (pixels)
                    </Label>
                    <Input
                      id={`node-${axis}`}
                      type="number"
                      min={0}
                      step={1}
                      value={Math.round(
                        editing.value.position[index],
                      ).toString()}
                      onChange={(event) =>
                        setEditing((current) =>
                          current && current.type === "node"
                            ? {
                                ...current,
                                value: {
                                  ...current.value,
                                  position: current.value.position.map(
                                    (value, idx) =>
                                      idx === index
                                        ? Number(event.target.value)
                                        : value,
                                  ) as Vertex["position"],
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {editing?.type === "edge" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edge-id">Identifier</Label>
                <Input
                  id="edge-id"
                  value={editing.value.id}
                  onChange={(event) =>
                    setEditing((current) =>
                      current && current.type === "edge"
                        ? {
                            ...current,
                            value: { ...current.value, id: event.target.value },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Source vertex</Label>
                <Select
                  value={editing.value.source}
                  onValueChange={(value) =>
                    setEditing((current) =>
                      current && current.type === "edge"
                        ? {
                            ...current,
                            value: { ...current.value, source: value },
                          }
                        : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose source" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Target vertex</Label>
                <Select
                  value={editing.value.target}
                  onValueChange={(value) =>
                    setEditing((current) =>
                      current && current.type === "edge"
                        ? {
                            ...current,
                            value: { ...current.value, target: value },
                          }
                        : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          {editing?.type === "feature" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>X (pixels)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={Math.round(editing.value.position[0]).toString()}
                    onChange={(event) =>
                      setEditing((current) =>
                        current && current.type === "feature"
                          ? {
                              ...current,
                              value: {
                                ...current.value,
                                position: [
                                  Number(event.target.value),
                                  current.value.position[1],
                                ],
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Y (pixels)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={Math.round(editing.value.position[1]).toString()}
                    onChange={(event) =>
                      setEditing((current) =>
                        current && current.type === "feature"
                          ? {
                              ...current,
                              value: {
                                ...current.value,
                                position: [
                                  current.value.position[0],
                                  Number(event.target.value),
                                ],
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
              {editing.value.type === "entrance" ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input
                      value={editing.value.label}
                      onChange={(event) =>
                        setEditing((current) =>
                          current &&
                          current.type === "feature" &&
                          current.value.type === "entrance"
                            ? {
                                ...current,
                                value: {
                                  ...current.value,
                                  label: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Target area</Label>
                    <Input
                      value={editing.value.target}
                      onChange={(event) =>
                        setEditing((current) =>
                          current &&
                          current.type === "feature" &&
                          current.value.type === "entrance"
                            ? {
                                ...current,
                                value: {
                                  ...current.value,
                                  target: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={editing.value.name}
                    onChange={(event) =>
                      setEditing((current) =>
                        current &&
                        current.type === "feature" &&
                        current.value.type !== "entrance"
                          ? {
                              ...current,
                              value: {
                                ...current.value,
                                name: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              )}
              <Separator />
              <ImageManager
                images={editing.value.images || []}
                onChange={(images) =>
                  setEditing((current) =>
                    current && current.type === "feature"
                      ? {
                          ...current,
                          value: { ...current.value, images },
                        }
                      : current,
                  )
                }
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
