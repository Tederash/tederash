import { ComponentAdaptations } from "@tederash/core";
import { useAccessibility } from "./useAccessibility";

export function useAdaptations(): ComponentAdaptations {
  const { adaptations } = useAccessibility();
  return adaptations;
}
