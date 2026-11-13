import { AccessibilityProfile } from "../profiles/types";
import { PersistenceAdapter } from "./types";

export class MemoryStorageAdapter implements PersistenceAdapter {
  private storedProfile: AccessibilityProfile | null = null;

  public load(): AccessibilityProfile | null {
    return this.storedProfile ? JSON.parse(JSON.stringify(this.storedProfile)) : null;
  }

  public save(profile: AccessibilityProfile): void {
    this.storedProfile = JSON.parse(JSON.stringify(profile));
  }

  public clear(): void {
    this.storedProfile = null;
  }
}
