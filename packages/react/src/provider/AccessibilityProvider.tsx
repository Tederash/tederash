import * as React from "react";
import {
  DeepPartial,
  PersistenceAdapter,
  TederashProfile,
  TederashRuntime,
  createTederashRuntime,
} from "@tederash/core";
import {
  ComponentOverrideContext,
  TederashContext,
  TederashContextValue,
} from "../context/AccessibilityContext";

export interface TederashProviderProps {
  children: React.ReactNode;
  /** Pass an existing runtime or let the provider instantiate one */
  runtime?: TederashRuntime;
  /** Initial profile fallback (defaults to standard) */
  defaultProfile?: TederashProfile;
  /** Application-wide default overrides */
  appDefaults?: DeepPartial<TederashProfile>;
  /** Storage persistence method: 'local' (default), 'memory', 'none', or custom adapter */
  persistence?: "local" | "memory" | "none" | PersistenceAdapter;
  /** Custom localStorage key */
  storageKey?: string;
  /** Automatically reflect CSS variables and data attributes onto document.documentElement (default: true) */
  applyStylesToRoot?: boolean;
}

export type AccessibilityProviderProps = TederashProviderProps;

export function TederashProvider({
  children,
  runtime: externalRuntime,
  defaultProfile,
  appDefaults,
  persistence = "local",
  storageKey,
  applyStylesToRoot = true,
}: TederashProviderProps) {
  // Lazily instantiate runtime if not supplied
  const [internalRuntime] = React.useState<TederashRuntime>(() => {
    if (externalRuntime) return externalRuntime;
    return createTederashRuntime({
      defaultProfile,
      appDefaults,
      persistence,
      storageKey,
    });
  });

  const runtime = externalRuntime ?? internalRuntime;

  // Subscribe using useSyncExternalStore. During hydration React uses the
  // server snapshot (defaults, no persisted preferences) so markup matches the
  // server render, then re-renders with the persisted profile.
  const state = React.useSyncExternalStore(
    runtime.subscribe,
    () => runtime.getState(),
    () => runtime.getServerState?.() ?? runtime.getState()
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

  const contextValue = React.useMemo<TederashContextValue>(() => {
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
    <TederashContext.Provider value={contextValue}>
      {children}
    </TederashContext.Provider>
  );
}

export const AccessibilityProvider = TederashProvider;

export interface TederashOverrideProps {
  children: React.ReactNode;
  override: Partial<TederashProfile>;
}

export type AccessibilityOverrideProps = TederashOverrideProps;

/**
 * Allows scoping preference overrides to a sub-tree of components
 */
export function TederashOverride({
  children,
  override,
}: TederashOverrideProps) {
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

export const AccessibilityOverride = TederashOverride;
