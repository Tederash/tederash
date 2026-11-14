export type AnnouncementPriority = "polite" | "assertive";

export type AnnouncementCategory = "status" | "alert" | "error" | "warning" | "success" | "info";

export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  category?: AnnouncementCategory;
  timestamp: number;
  /** False when the announcement must not be read aloud by speech output */
  spoken?: boolean;
}

export interface AnnouncementOptions {
  message: string;
  priority?: AnnouncementPriority;
  category?: AnnouncementCategory;
  /** If true, ignore this announcement if identical to the recent message within 1500ms */
  deduplicate?: boolean;
  /**
   * Set to false to skip spoken (text-to-speech) readout while still updating
   * live regions and visual banners, e.g. when the microphone is about to
   * listen and spoken audio would be picked up as dictation.
   */
  spoken?: boolean;
}

export type AnnouncementListener = (announcement: Announcement) => void;
