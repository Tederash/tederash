import * as React from "react";
import { Announcement, AnnouncementOptions } from "@tederash/core";
import { useAccessibility } from "./useAccessibility";

export function useAnnounce() {
  const { announce } = useAccessibility();
  return announce;
}

export function useLiveAnnouncements(
  onAnnouncement: (announcement: Announcement) => void
) {
  const { runtime } = useAccessibility();

  React.useEffect(() => {
    return runtime.onAnnounce(onAnnouncement);
  }, [runtime, onAnnouncement]);
}
