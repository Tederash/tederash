import * as React from "react";
import {
  TederashProfile,
  resolveAdaptations,
  resolveProfile,
} from "@tederash/core";
import {
  ComponentOverrideContext,
  TederashContext,
  TederashContextValue,
} from "../context/AccessibilityContext";

export interface UseTederashResult extends TederashContextValue {
  /** Effective profile considering active component-level overrides */
  effectiveProfile: TederashProfile;
}

export type UseAccessibilityResult = UseTederashResult;

export function useTederash(): UseTederashResult {
  const context = React.useContext(TederashContext);
  const override = React.useContext(ComponentOverrideContext);

  if (!context) {
    throw new Error(
      "useTederash / useAccessibility must be used within an <AccessibilityProvider> or <TederashProvider>. Ensure <TederashProvider> wraps your component tree."
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

export const useAccessibility = useTederash;
