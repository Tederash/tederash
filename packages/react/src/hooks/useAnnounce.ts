import * as React from "react";
import { Announcement, AnnouncementOptions } from "@tederash/core";
import { useTederash } from "./useAccessibility";

export function useTederashAnnounce() {
  const { announce } = useTederash();
  return announce;
}

export const useAnnounce = useTederashAnnounce;
export const useAccessibilityAnnounce = useTederashAnnounce;

export function useTederashLiveAnnouncements(
  onAnnouncement: (announcement: Announcement) => void
) {
  const { runtime } = useTederash();

  React.useEffect(() => {
    return runtime.onAnnounce(onAnnouncement);
  }, [runtime, onAnnouncement]);
}

export const useLiveAnnouncements = useTederashLiveAnnouncements;
