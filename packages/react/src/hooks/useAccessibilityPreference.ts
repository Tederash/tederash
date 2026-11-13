import { useTederash } from "./useAccessibility";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export function useTederashPreference<T = unknown>(path: string): T | undefined {
  const { effectiveProfile } = useTederash();

  const keys = path.split(".");
  let current: unknown = effectiveProfile;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current as T;
}

export const useAccessibilityPreference = useTederashPreference;
