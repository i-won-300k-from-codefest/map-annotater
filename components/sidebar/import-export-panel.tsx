"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

interface ImportExportPanelProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export function ImportExportPanel({ onExport, onImport }: ImportExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset the input so the same file can be selected again
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Data Management</CardTitle>
        <CardDescription className="text-xs">
          Export or import annotation data
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleImportClick}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import JSON
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
