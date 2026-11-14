import { ComponentAdaptations } from "../adaptation/types";
import { Announcement, AnnouncementListener, AnnouncementOptions } from "../events/types";
import { PersistenceAdapter } from "../persistence/types";
import {
  DeepPartial,
  TederashPreferencesUpdate,
  TederashProfile,
} from "../profiles/types";

export interface TederashRuntimeConfig {
  /** The initial baseline profile, defaults to DEFAULT_TEDERASH_PROFILE */
  defaultProfile?: TederashProfile;
  /** Application-level preference defaults applied under the active profile */
  appDefaults?: DeepPartial<TederashProfile>;
  /** Persistence strategy */
  persistence?: "local" | "memory" | "none" | PersistenceAdapter;
  /** Custom storage key for localStorage */
  storageKey?: string;
}

export type RuntimeConfig = TederashRuntimeConfig;

export interface TederashRuntimeState {
  profile: TederashProfile;
  adaptations: ComponentAdaptations;
}

export type RuntimeState = TederashRuntimeState;

export type TederashRuntimeListener = (state: TederashRuntimeState) => void;
export type RuntimeListener = TederashRuntimeListener;

export interface TederashRuntime {
  /** Retrieve the current active profile */
  getProfile(): TederashProfile;

  /** Retrieve the resolved adaptations for the active profile */
  getAdaptations(): ComponentAdaptations;

  /** Retrieve the complete runtime state */
  getState(): TederashRuntimeState;

  /**
   * State resolved from the default/app profiles only, ignoring persisted
   * preferences. Stable across calls. Used as the server snapshot so the
   * first client render during hydration matches server-rendered markup;
   * the persisted profile is applied immediately afterwards.
   */
  getServerState?(): TederashRuntimeState;

  /** Replace the active profile with a new one */
  setProfile(profile: TederashProfile | Partial<TederashProfile>): void;

  /** Deep update specific preferences within the active profile */
  updatePreferences(preferences: TederashPreferencesUpdate): void;

  /** Reset preferences back to the default profile */
  resetProfile(): void;

  /** Subscribe to profile and adaptation state changes */
  subscribe(listener: TederashRuntimeListener): () => void;

  /** Dispatch a live announcement for screen readers and UI feedback */
  announce(options: AnnouncementOptions): Announcement;

  /** Subscribe to live announcements */
  onAnnounce(listener: AnnouncementListener): () => void;

  /** Clean up all subscribers and event listeners */
  destroy(): void;
}

export type AccessibilityRuntime = TederashRuntime;
