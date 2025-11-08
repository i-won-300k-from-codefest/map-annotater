import type { Feature } from "@/lib/types";

export type AnnotationMode = "topology" | "features";

export type AnnotationTool =
  | "select"
  | "add-node"
  | "add-edge"
  | "feature-shop"
  | "feature-restaurant"
  | "feature-entrance";

export const featureTools = [
  "feature-shop",
  "feature-restaurant",
  "feature-entrance",
] as const satisfies AnnotationTool[];

export const isFeatureTool = (tool: AnnotationTool) =>
  featureTools.includes(tool as (typeof featureTools)[number]);

export type FeatureDraft =
  | {
      type: Extract<Feature["type"], "shop" | "restaurant">;
      name: string;
    }
  | {
      type: "entrance";
      label: string;
      target: string;
    };

export const createEmptyDraft = (type: FeatureDraft["type"]): FeatureDraft => {
  if (type === "entrance") {
    return {
      type,
      label: "",
      target: "",
    };
  }

  return {
    type,
    name: "",
  };
};

export type AnnotatedFeature = Feature & { id: string };
