import { Announcement, AnnouncementListener, AnnouncementOptions } from "./types";

export class AccessibilityEventBus {
  private listeners: Set<AnnouncementListener> = new Set();
  private lastAnnouncement?: Announcement;
  private idCounter = 0;

  public subscribe(listener: AnnouncementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public announce(options: AnnouncementOptions): Announcement {
    const now = Date.now();
    const priority = options.priority ?? "polite";

    if (
      options.deduplicate &&
      this.lastAnnouncement &&
      this.lastAnnouncement.message === options.message &&
      now - this.lastAnnouncement.timestamp < 1500
    ) {
      return this.lastAnnouncement;
    }

    const announcement: Announcement = {
      id: `a11y-announcement-${++this.idCounter}-${now}`,
      message: options.message,
      priority,
      category: options.category,
      timestamp: now,
    };

    this.lastAnnouncement = announcement;

    for (const listener of this.listeners) {
      try {
        listener(announcement);
      } catch (err) {
        console.error("Error in accessibility announcement listener:", err);
      }
    }

    return announcement;
  }

  public clear(): void {
    this.lastAnnouncement = undefined;
    this.listeners.clear();
  }
}
