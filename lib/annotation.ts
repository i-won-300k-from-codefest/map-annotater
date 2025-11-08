import type { Feature, FeatureImage } from "@/lib/types";

export type AnnotationMode = "topology" | "features";

export type AnnotationTool =
  | "select"
  | "add-node"
  | "add-edge"
  | "feature-shop"
  | "feature-restaurant"
  | "feature-entrance"
  | "feature-restroom";

export const featureTools = [
  "feature-shop",
  "feature-restaurant",
  "feature-entrance",
  "feature-restroom",
] as const satisfies AnnotationTool[];

export const isFeatureTool = (tool: AnnotationTool) =>
  featureTools.includes(tool as (typeof featureTools)[number]);

export type FeatureDraft =
  | {
      type: Extract<Feature["type"], "shop" | "restaurant">;
      name: string;
      images: FeatureImage[];
    }
  | {
      type: "entrance";
      label: string;
      target: string;
      images: FeatureImage[];
    }
  | {
      type: "restroom";
      label: string;
      images: FeatureImage[];
    };

export const createEmptyDraft = (type: FeatureDraft["type"]): FeatureDraft => {
  if (type === "entrance") {
    return {
      type,
      label: "",
      target: "",
      images: [],
    };
  }

  if (type === "restroom") {
    return {
      type,
      label: "",
      images: [],
    };
  }

  return {
    type,
    name: "",
    images: [],
  };
};

export const featureToolFromType = (
  type: FeatureDraft["type"],
): AnnotationTool =>
  type === "entrance"
    ? "feature-entrance"
    : type === "restroom"
      ? "feature-restroom"
      : type === "shop"
        ? "feature-shop"
        : "feature-restaurant";

export type AnnotatedFeature = Feature & { id: string };
