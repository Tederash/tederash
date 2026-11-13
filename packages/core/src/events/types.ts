export type AnnouncementPriority = "polite" | "assertive";

export type AnnouncementCategory = "status" | "alert" | "error" | "warning" | "success" | "info";

export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  category?: AnnouncementCategory;
  timestamp: number;
}

export interface AnnouncementOptions {
  message: string;
  priority?: AnnouncementPriority;
  category?: AnnouncementCategory;
  /** If true, ignore this announcement if identical to the recent message within 1500ms */
  deduplicate?: boolean;
}

export type AnnouncementListener = (announcement: Announcement) => void;
