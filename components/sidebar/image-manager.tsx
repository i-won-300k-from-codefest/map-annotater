"use client";

import { FeatureImage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { GripVertical, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface ImageManagerProps {
  images: FeatureImage[];
  onChange: (images: FeatureImage[]) => void;
}

interface SortableImageItemProps {
  image: FeatureImage;
  index: number;
  onUpdate: (index: number, field: "url" | "caption", value: string) => void;
  onDelete: (index: number) => void;
}

function SortableImageItem({
  image,
  index,
  onUpdate,
  onDelete,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `image-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [imageError, setImageError] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 p-3 border rounded-lg bg-background"
    >
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="flex-shrink-0 cursor-grab active:cursor-grabbing mt-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent side="left" className="w-80">
          {image.url ? (
            imageError ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2" />
                <p className="text-sm">Failed to load image</p>
                <p className="text-xs mt-1 text-center break-all">
                  {image.url}
                </p>
              </div>
            ) : (
              <img
                src={image.url}
                alt={image.caption || `Image ${index + 1}`}
                className="w-full h-auto rounded"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            )
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <p className="text-sm">No image URL provided</p>
            </div>
          )}
          {image.caption && (
            <p className="text-sm mt-2 text-muted-foreground">
              {image.caption}
            </p>
          )}
        </HoverCardContent>
      </HoverCard>

      <div className="flex-1 space-y-2">
        <div>
          <Label htmlFor={`image-url-${index}`} className="text-xs">
            Image URL
          </Label>
          <Input
            id={`image-url-${index}`}
            type="url"
            placeholder="https://example.com/image.jpg"
            value={image.url}
            onChange={(e) => onUpdate(index, "url", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`image-caption-${index}`} className="text-xs">
            Caption (optional)
          </Label>
          <Textarea
            id={`image-caption-${index}`}
            placeholder="Add a description..."
            value={image.caption || ""}
            onChange={(e) => onUpdate(index, "caption", e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        className="flex-shrink-0 mt-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ImageManager({ images, onChange }: ImageManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace("image-", ""));
      const newIndex = parseInt(over.id.toString().replace("image-", ""));
      onChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    onChange([...images, { url: "", caption: "" }]);
  };

  const handleUpdate = (
    index: number,
    field: "url" | "caption",
    value: string,
  ) => {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>Images</Label>

      {images.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
          No images added yet. Click &quot;Add Image&quot; to start.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((_, i) => `image-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {images.map((image, index) => (
                <SortableImageItem
                  key={`image-${index}`}
                  image={image}
                  index={index}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Image
      </Button>
    </div>
  );
}
