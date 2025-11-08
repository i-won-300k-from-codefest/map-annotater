import { useCallback, useMemo, useState } from "react";
import type { Edge, Vertex } from "@/lib/types";
import type { AnnotatedFeature } from "@/lib/annotation";

type AnnotationState = {
  nodes: Vertex[];
  edges: Edge[];
  features: AnnotatedFeature[];
};

const emptyState: AnnotationState = {
  nodes: [],
  edges: [],
  features: [],
};

const cloneState = (state: AnnotationState): AnnotationState =>
  typeof structuredClone === "function"
    ? structuredClone(state)
    : (JSON.parse(JSON.stringify(state)) as AnnotationState);

export const useAnnotationHistory = () => {
  const [past, setPast] = useState<AnnotationState[]>([]);
  const [present, setPresent] = useState<AnnotationState>(emptyState);
  const [future, setFuture] = useState<AnnotationState[]>([]);

  const commit = useCallback(
    (updater: (state: AnnotationState) => AnnotationState) => {
      setPresent((current) => {
        setPast((prev) => [...prev, cloneState(current)]);
        setFuture([]);
        return updater(current);
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setPast((prev) => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setPresent((current) => {
        setFuture((next) => [cloneState(current), ...next]);
        return previous;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((next) => {
      if (!next.length) return next;
      const [first, ...rest] = next;
      setPresent((current) => {
        setPast((prev) => [...prev, cloneState(current)]);
        return first;
      });
      return rest;
    });
  }, []);

  const reset = useCallback(() => {
    setPast([]);
    setPresent(emptyState);
    setFuture([]);
  }, []);

  const canUndo = useMemo(() => past.length > 0, [past.length]);
  const canRedo = useMemo(() => future.length > 0, [future.length]);

  return {
    state: present,
    commit,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } as const;
};
