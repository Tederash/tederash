import * as React from "react";
import {
  AccessibilityProfile,
  resolveAdaptations,
  resolveProfile,
} from "@tederash/core";
import {
  AccessibilityContext,
  AccessibilityContextValue,
  ComponentOverrideContext,
} from "../context/AccessibilityContext";

export interface UseAccessibilityResult extends AccessibilityContextValue {
  /** Effective profile considering active component-level overrides */
  effectiveProfile: AccessibilityProfile;
}

export function useAccessibility(): UseAccessibilityResult {
  const context = React.useContext(AccessibilityContext);
  const override = React.useContext(ComponentOverrideContext);

  if (!context) {
    throw new Error(
      "useAccessibility must be used within an <AccessibilityProvider>. Ensure <AccessibilityProvider> wraps your component tree."
    );
  }

  const effectiveProfile = React.useMemo(() => {
    if (!override) return context.profile;
    return resolveProfile(context.profile, undefined, undefined, override);
  }, [context.profile, override]);

  const effectiveAdaptations = React.useMemo(() => {
    if (!override) return context.adaptations;
    return resolveAdaptations(effectiveProfile);
  }, [context.adaptations, effectiveProfile, override]);

  return {
    ...context,
    effectiveProfile,
    adaptations: effectiveAdaptations,
  };
}
