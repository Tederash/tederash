import * as React from "react";
import {
  Announcement,
  AnnouncementOptions,
  ComponentAdaptations,
  TederashPreferencesUpdate,
  TederashProfile,
  TederashRuntime,
} from "@tederash/core";

export interface TederashContextValue {
  runtime: TederashRuntime;
  profile: TederashProfile;
  adaptations: ComponentAdaptations;
  setProfile: (profile: TederashProfile | Partial<TederashProfile>) => void;
  updatePreferences: (preferences: TederashPreferencesUpdate) => void;
  resetProfile: () => void;
  announce: (options: AnnouncementOptions) => Announcement;
}

export type AccessibilityContextValue = TederashContextValue;

export const TederashContext =
  React.createContext<TederashContextValue | null>(null);

export const AccessibilityContext = TederashContext;

export const TederashOverrideContext =
  React.createContext<Partial<TederashProfile> | null>(null);

export const ComponentOverrideContext = TederashOverrideContext;
