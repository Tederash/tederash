import * as React from "react";
import { runTederashInteraction } from "../bridge/interactions";
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
import type {
  TederashBridgeRequestDetail,
  TederashBridgeResponseDetail,
} from "../bridge/types";

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

    // Stamp root handshake markers for the Tederash Extension & tools
    root.setAttribute("data-tederash-root", "true");
    root.setAttribute("data-tederash-version", "0.1.0");
    root.setAttribute("data-a11y-profile", state.profile.id);
    root.setAttribute("data-a11y-locale", state.profile.speech?.language || "en");

    // Apply CSS variables
    for (const [key, value] of Object.entries(cssVariables)) {
      root.style.setProperty(key, value);
    }

    // Apply data attributes
    for (const [attr, val] of Object.entries(dataAttributes)) {
      root.setAttribute(attr, val);
    }

    return () => {
      // Cleanup handshake markers when unmounting
      root.removeAttribute("data-tederash-root");
      root.removeAttribute("data-tederash-version");
    };
  }, [state.adaptations, state.profile.id, state.profile.speech?.language, applyStylesToRoot]);

  // Real-time state broadcasting to window for assistive tools and extensions
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.dispatchEvent(
        new CustomEvent("tederash:state_change", {
          detail: {
            profile: state.profile,
            adaptations: state.adaptations,
          },
        })
      );
    } catch {
      // Ignore if event dispatch fails in restricted contexts
    }
  }, [state.profile, state.adaptations]);

  // Window bridge listener for deterministic external control (Extension sidepanel / Agent)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBridgeRequest = (event: Event) => {
      const customEvent = event as CustomEvent<TederashBridgeRequestDetail>;
      const detail = customEvent.detail;
      if (!detail || !detail.id || !detail.type) return;

      const respond = (ok: boolean, data?: any, error?: string) => {
        const responseDetail: TederashBridgeResponseDetail = {
          id: detail.id,
          ok,
          data,
          error,
        };
        window.dispatchEvent(
          new CustomEvent("tederash:response", { detail: responseDetail })
        );
      };

      try {
        switch (detail.type) {
          case "tederash:get_state": {
            const current = runtime.getState();
            respond(true, {
              profile: current.profile,
              adaptations: current.adaptations,
              version: "0.1.0",
            });
            break;
          }
          case "tederash:set_profile": {
            if (!detail.payload?.profile) {
              respond(false, undefined, "Missing profile in payload");
              return;
            }
            runtime.setProfile(detail.payload.profile);
            respond(true, runtime.getState());
            break;
          }
          case "tederash:update_pref": {
            if (!detail.payload?.patch) {
              respond(false, undefined, "Missing patch in payload");
              return;
            }
            runtime.updatePreferences(detail.payload.patch);
            respond(true, runtime.getState());
            break;
          }
          case "tederash:reset_profile": {
            runtime.resetProfile();
            respond(true, runtime.getState());
            break;
          }
          case "tederash:announce": {
            const msg = detail.payload?.message;
            if (!msg) {
              respond(false, undefined, "Missing message in payload");
              return;
            }
            const priority = detail.payload?.priority || "polite";
            runtime.announce({ message: msg, priority });
            respond(true, { announced: true, message: msg, priority });
            break;
          }
          case "tederash:interact": {
            const { id, action, value } = detail.payload ?? {};
            if (typeof id !== "string" || !["fill", "choose", "setChecked"].includes(action)) {
              respond(false, undefined, "Missing id or action in payload");
              return;
            }
            const result = runTederashInteraction(id, action, value);
            respond(result.ok, result, result.error);
            break;
          }
          default:
            respond(false, undefined, `Unknown bridge request type: ${detail.type}`);
        }
      } catch (err) {
        respond(false, undefined, err instanceof Error ? err.message : String(err));
      }
    };

    window.addEventListener("tederash:request", handleBridgeRequest);
    return () => {
      window.removeEventListener("tederash:request", handleBridgeRequest);
    };
  }, [runtime]);

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
