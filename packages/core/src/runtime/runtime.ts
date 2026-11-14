import { resolveAdaptations } from "../adaptation/rules";
import { AccessibilityEventBus } from "../events/bus";
import { Announcement, AnnouncementListener, AnnouncementOptions } from "../events/types";
import { LocalStorageAdapter } from "../persistence/local-storage";
import { MemoryStorageAdapter } from "../persistence/memory";
import { PersistenceAdapter } from "../persistence/types";
import { DEFAULT_TEDERASH_PROFILE } from "../profiles/defaults";
import { deepMerge, resolveProfile } from "../profiles/merge";
import {
  DeepPartial,
  TederashPreferencesUpdate,
  TederashProfile,
} from "../profiles/types";
import { sanitizeProfile, validateProfile } from "../profiles/validation";
import {
  TederashRuntime,
  TederashRuntimeConfig,
  TederashRuntimeListener,
  TederashRuntimeState,
} from "./types";

export function createTederashRuntime(
  config: TederashRuntimeConfig = {}
): TederashRuntime {
  const baseDefault = config.defaultProfile ?? DEFAULT_TEDERASH_PROFILE;
  const appDefaults = config.appDefaults;

  let persistence: PersistenceAdapter | null = null;
  if (config.persistence === "memory") {
    persistence = new MemoryStorageAdapter();
  } else if (config.persistence === "none") {
    persistence = null;
  } else if (typeof config.persistence === "object" && config.persistence !== null) {
    persistence = config.persistence;
  } else {
    // Default to 'local' persistence
    persistence = new LocalStorageAdapter(config.storageKey);
  }

  // Snapshot from defaults only (what a server render produces, since
  // persisted preferences are unavailable there).
  const defaultsProfile = sanitizeProfile(resolveProfile(baseDefault, appDefaults));
  const serverState: TederashRuntimeState = {
    profile: defaultsProfile,
    adaptations: resolveAdaptations(defaultsProfile),
  };

  // Initial state: persisted preferences when present, otherwise the very same
  // defaults snapshot object, so hydration triggers no extra re-render.
  let currentState: TederashRuntimeState = serverState;
  if (persistence) {
    const saved = persistence.load();
    if (saved && validateProfile(saved).valid) {
      const restored = sanitizeProfile(resolveProfile(baseDefault, appDefaults, saved));
      currentState = { profile: restored, adaptations: resolveAdaptations(restored) };
    }
  }

  let currentProfile: TederashProfile = currentState.profile;
  let currentAdaptations = currentState.adaptations;

  const listeners: Set<TederashRuntimeListener> = new Set();
  const eventBus = new AccessibilityEventBus();

  const updateStateAndNotify = (newProfile: TederashProfile) => {
    currentProfile = newProfile;
    currentAdaptations = resolveAdaptations(currentProfile);
    currentState = {
      profile: currentProfile,
      adaptations: currentAdaptations,
    };

    for (const listener of listeners) {
      try {
        listener(currentState);
      } catch (err) {
        console.error("Error in accessibility runtime listener:", err);
      }
    }
  };

  const runtime: TederashRuntime = {
    getProfile() {
      return currentState.profile;
    },

    getAdaptations() {
      return currentState.adaptations;
    },

    getState() {
      return currentState;
    },

    getServerState() {
      return serverState;
    },

    setProfile(profile) {
      const merged = resolveProfile(
        baseDefault,
        appDefaults,
        profile as DeepPartial<TederashProfile>
      );
      const sanitized = sanitizeProfile(merged);

      if (persistence) {
        persistence.save(sanitized);
      }

      updateStateAndNotify(sanitized);
    },

    updatePreferences(preferences: TederashPreferencesUpdate) {
      const merged = deepMerge(
        currentProfile as unknown as Record<string, unknown>,
        preferences as unknown as Record<string, unknown>
      ) as unknown as TederashProfile;

      const sanitized = sanitizeProfile(merged);

      if (persistence) {
        persistence.save(sanitized);
      }

      updateStateAndNotify(sanitized);
    },

    resetProfile() {
      const reset = sanitizeProfile(resolveProfile(baseDefault, appDefaults));

      if (persistence) {
        persistence.clear();
      }

      updateStateAndNotify(reset);
    },

    subscribe(listener: TederashRuntimeListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    announce(options: AnnouncementOptions): Announcement {
      return eventBus.announce(options);
    },

    onAnnounce(listener: AnnouncementListener) {
      return eventBus.subscribe(listener);
    },

    destroy() {
      listeners.clear();
      eventBus.clear();
    },
  };

  return runtime;
}

export const createAccessibilityRuntime = createTederashRuntime;
