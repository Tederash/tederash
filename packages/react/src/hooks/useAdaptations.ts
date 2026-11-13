import { ComponentAdaptations } from "@tederash/core";
import { useTederash } from "./useAccessibility";

export function useTederashAdaptations(): ComponentAdaptations {
  const { adaptations } = useTederash();
  return adaptations;
}

export const useAdaptations = useTederashAdaptations;
