import * as React from "react";
import {
  AccessibilityProfile,
  AccessibilityRuntime,
  DeepPartial,
  PersistenceAdapter,
  createAccessibilityRuntime,
} from "@tederash/core";
import {
  AccessibilityContext,
  AccessibilityContextValue,
  ComponentOverrideContext,
} from "../context/AccessibilityContext";

export interface AccessibilityProviderProps {
  children: React.ReactNode;
  /** Pass an existing runtime or let the provider instantiate one */
  runtime?: AccessibilityRuntime;
  /** Initial profile fallback (defaults to standard) */
  defaultProfile?: AccessibilityProfile;
  /** Application-wide default overrides */
  appDefaults?: DeepPartial<AccessibilityProfile>;
  /** Storage persistence method: 'local' (default), 'memory', 'none', or custom adapter */
  persistence?: "local" | "memory" | "none" | PersistenceAdapter;
  /** Custom localStorage key */
  storageKey?: string;
  /** Automatically reflect CSS variables and data attributes onto document.documentElement (default: true) */
  applyStylesToRoot?: boolean;
}

export function AccessibilityProvider({
  children,
  runtime: externalRuntime,
  defaultProfile,
  appDefaults,
  persistence = "local",
  storageKey,
  applyStylesToRoot = true,
}: AccessibilityProviderProps) {
  // Lazily instantiate runtime if not supplied
  const [internalRuntime] = React.useState<AccessibilityRuntime>(() => {
    if (externalRuntime) return externalRuntime;
    return createAccessibilityRuntime({
      defaultProfile,
      appDefaults,
      persistence,
      storageKey,
    });
  });

  const runtime = externalRuntime ?? internalRuntime;

  // Subscribe using useSyncExternalStore
  const state = React.useSyncExternalStore(
    runtime.subscribe,
    () => runtime.getState(),
    () => runtime.getState()
  );

  // Apply CSS variables and data attributes to document.documentElement
  React.useEffect(() => {
    if (!applyStylesToRoot || typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const { cssVariables, dataAttributes } = state.adaptations;

    // Apply CSS variables
    for (const [key, value] of Object.entries(cssVariables)) {
      root.style.setProperty(key, value);
    }

    // Apply data attributes
    for (const [attr, val] of Object.entries(dataAttributes)) {
      root.setAttribute(attr, val);
    }
  }, [state.adaptations, applyStylesToRoot]);

  const contextValue = React.useMemo<AccessibilityContextValue>(() => {
    return {
      runtime,
      profile: state.profile,
      adaptations: state.adaptations,
      setProfile: (profile) => runtime.setProfile(profile),
      updatePreferences: (prefs) => runtime.updatePreferences(prefs),
      resetProfile: () => runtime.resetProfile(),
      announce: (options) => runtime.announce(options),
    };
  }, [runtime, state.profile, state.adaptations]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export interface AccessibilityOverrideProps {
  children: React.ReactNode;
  override: Partial<AccessibilityProfile>;
}

/**
 * Allows scoping preference overrides to a sub-tree of components
 */
export function AccessibilityOverride({
  children,
  override,
}: AccessibilityOverrideProps) {
  const parentOverride = React.useContext(ComponentOverrideContext);
  const mergedOverride = React.useMemo(() => {
    return { ...parentOverride, ...override };
  }, [parentOverride, override]);

  return (
    <ComponentOverrideContext.Provider value={mergedOverride}>
      {children}
    </ComponentOverrideContext.Provider>
  );
}
