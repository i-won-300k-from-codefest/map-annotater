"use client";

import Image from "next/image";
import { useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface UploadPanelProps {
  imageSrc: string | null;
  onUpload: (file: File) => void;
  onClear: () => void;
}

export function UploadPanel({ imageSrc, onUpload, onClear }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload(file);
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Area Base</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Upload a floor plan or map snapshot to start annotating.
          </Label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              {imageSrc ? "Replace image" : "Upload image"}
            </Button>
            {imageSrc ? (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative h-40 overflow-hidden rounded-md border bg-muted/40">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt="Uploaded area"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image selected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
