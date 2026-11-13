import { ComponentAdaptations } from "../adaptation/types";
import { Announcement, AnnouncementListener, AnnouncementOptions } from "../events/types";
import { PersistenceAdapter } from "../persistence/types";
import {
  AccessibilityPreferencesUpdate,
  AccessibilityProfile,
  DeepPartial,
} from "../profiles/types";

export interface RuntimeConfig {
  /** The initial baseline profile, defaults to DEFAULT_PROFILE */
  defaultProfile?: AccessibilityProfile;
  /** Application-level preference defaults applied under the active profile */
  appDefaults?: DeepPartial<AccessibilityProfile>;
  /** Persistence strategy */
  persistence?: "local" | "memory" | "none" | PersistenceAdapter;
  /** Custom storage key for localStorage */
  storageKey?: string;
}

export interface RuntimeState {
  profile: AccessibilityProfile;
  adaptations: ComponentAdaptations;
}

export type RuntimeListener = (state: RuntimeState) => void;

export interface AccessibilityRuntime {
  /** Retrieve the current active profile */
  getProfile(): AccessibilityProfile;

  /** Retrieve the resolved adaptations for the active profile */
  getAdaptations(): ComponentAdaptations;

  /** Retrieve the complete runtime state */
  getState(): RuntimeState;

  /** Replace the active profile with a new one */
  setProfile(profile: AccessibilityProfile | Partial<AccessibilityProfile>): void;

  /** Deep update specific preferences within the active profile */
  updatePreferences(preferences: AccessibilityPreferencesUpdate): void;

  /** Reset preferences back to the default profile */
  resetProfile(): void;

  /** Subscribe to profile and adaptation state changes */
  subscribe(listener: RuntimeListener): () => void;

  /** Dispatch a live announcement for screen readers and UI feedback */
  announce(options: AnnouncementOptions): Announcement;

  /** Subscribe to live announcements */
  onAnnounce(listener: AnnouncementListener): () => void;

  /** Clean up all subscribers and event listeners */
  destroy(): void;
}
