import { AccessibilityProfile } from "../profiles/types";
import { validateProfile } from "../profiles/validation";
import { PersistenceAdapter } from "./types";

export const DEFAULT_STORAGE_KEY = "tederash:a11y:profile";

export class LocalStorageAdapter implements PersistenceAdapter {
  private key: string;

  constructor(key: string = DEFAULT_STORAGE_KEY) {
    this.key = key;
  }

  public load(): AccessibilityProfile | null {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    try {
      const serialized = window.localStorage.getItem(this.key);
      if (!serialized) return null;

      const parsed = JSON.parse(serialized);
      const validation = validateProfile(parsed);
      if (!validation.valid) {
        console.warn("Invalid accessibility profile found in storage, ignoring:", validation.errors);
        return null;
      }

      return parsed as AccessibilityProfile;
    } catch (err) {
      console.warn("Failed to read accessibility preferences from localStorage:", err);
      return null;
    }
  }

  public save(profile: AccessibilityProfile): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(this.key, JSON.stringify(profile));
    } catch (err) {
      console.warn("Failed to persist accessibility preferences to localStorage:", err);
    }
  }

  public clear(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.removeItem(this.key);
    } catch (err) {
      console.warn("Failed to clear accessibility preferences from localStorage:", err);
    }
  }
}
