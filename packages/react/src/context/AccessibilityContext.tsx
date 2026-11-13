import * as React from "react";
import {
  AccessibilityPreferencesUpdate,
  AccessibilityProfile,
  AccessibilityRuntime,
  Announcement,
  AnnouncementOptions,
  ComponentAdaptations,
} from "@tederash/core";

export interface AccessibilityContextValue {
  runtime: AccessibilityRuntime;
  profile: AccessibilityProfile;
  adaptations: ComponentAdaptations;
  setProfile: (profile: AccessibilityProfile | Partial<AccessibilityProfile>) => void;
  updatePreferences: (preferences: AccessibilityPreferencesUpdate) => void;
  resetProfile: () => void;
  announce: (options: AnnouncementOptions) => Announcement;
}

export const AccessibilityContext =
  React.createContext<AccessibilityContextValue | null>(null);

export const ComponentOverrideContext =
  React.createContext<Partial<AccessibilityProfile> | null>(null);
