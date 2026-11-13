import { resolveAdaptations } from "../adaptation/rules";
import { AccessibilityEventBus } from "../events/bus";
import { Announcement, AnnouncementListener, AnnouncementOptions } from "../events/types";
import { LocalStorageAdapter } from "../persistence/local-storage";
import { MemoryStorageAdapter } from "../persistence/memory";
import { PersistenceAdapter } from "../persistence/types";
import { DEFAULT_PROFILE } from "../profiles/defaults";
import { deepMerge, resolveProfile } from "../profiles/merge";
import {
  AccessibilityPreferencesUpdate,
  AccessibilityProfile,
  DeepPartial,
} from "../profiles/types";
import { sanitizeProfile, validateProfile } from "../profiles/validation";
import {
  AccessibilityRuntime,
  RuntimeConfig,
  RuntimeListener,
  RuntimeState,
} from "./types";

export function createAccessibilityRuntime(
  config: RuntimeConfig = {}
): AccessibilityRuntime {
  const baseDefault = config.defaultProfile ?? DEFAULT_PROFILE;
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

  // Initial profile resolution: check persistence first, fallback to defaults
  let initialProfile: AccessibilityProfile = resolveProfile(
    baseDefault,
    appDefaults
  );

  if (persistence) {
    const saved = persistence.load();
    if (saved && validateProfile(saved).valid) {
      initialProfile = resolveProfile(baseDefault, appDefaults, saved);
    }
  }

  let currentProfile: AccessibilityProfile = sanitizeProfile(initialProfile);
  let currentAdaptations = resolveAdaptations(currentProfile);

  let currentState: RuntimeState = {
    profile: currentProfile,
    adaptations: currentAdaptations,
  };

  const listeners: Set<RuntimeListener> = new Set();
  const eventBus = new AccessibilityEventBus();

  const updateStateAndNotify = (newProfile: AccessibilityProfile) => {
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

  const runtime: AccessibilityRuntime = {
    getProfile() {
      return currentState.profile;
    },

    getAdaptations() {
      return currentState.adaptations;
    },

    getState() {
      return currentState;
    },

    setProfile(profile) {
      const merged = resolveProfile(
        baseDefault,
        appDefaults,
        profile as DeepPartial<AccessibilityProfile>
      );
      const sanitized = sanitizeProfile(merged);

      if (persistence) {
        persistence.save(sanitized);
      }

      updateStateAndNotify(sanitized);
    },

    updatePreferences(preferences: AccessibilityPreferencesUpdate) {
      const merged = deepMerge(
        currentProfile as unknown as Record<string, unknown>,
        preferences as unknown as Record<string, unknown>
      ) as unknown as AccessibilityProfile;

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

    subscribe(listener: RuntimeListener) {
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
