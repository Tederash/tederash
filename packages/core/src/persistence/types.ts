import { AccessibilityProfile } from "../profiles/types";

export interface PersistenceAdapter {
  load(): AccessibilityProfile | null;
  save(profile: AccessibilityProfile): void;
  clear(): void;
}
