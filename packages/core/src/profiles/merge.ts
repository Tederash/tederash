import { AccessibilityProfile, DeepPartial } from "./types";
import { DEFAULT_PROFILE } from "./defaults";

function isPlainObject(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

/**
 * Recursively merges source into target without mutating either.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source?: Record<string, unknown>
): T {
  if (!source) return { ...target };

  const output = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = output[key];

    if (sourceVal === undefined) {
      continue;
    }

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }

  return output as T;
}

/**
 * Resolves an effective accessibility profile following the explicit precedence hierarchy:
 * 1. Component-level override (highest precedence)
 * 2. Active user profile
 * 3. Application-level defaults
 * 4. Framework defaults (lowest precedence, fallback)
 */
export function resolveProfile(
  frameworkDefault: AccessibilityProfile = DEFAULT_PROFILE,
  appDefaults?: DeepPartial<AccessibilityProfile>,
  activeProfile?: DeepPartial<AccessibilityProfile>,
  componentOverride?: DeepPartial<AccessibilityProfile>
): AccessibilityProfile {
  let resolved = { ...frameworkDefault };

  if (appDefaults) {
    resolved = deepMerge(resolved as unknown as Record<string, unknown>, appDefaults as unknown as Record<string, unknown>) as unknown as AccessibilityProfile;
  }

  if (activeProfile) {
    resolved = deepMerge(resolved as unknown as Record<string, unknown>, activeProfile as unknown as Record<string, unknown>) as unknown as AccessibilityProfile;
  }

  if (componentOverride) {
    resolved = deepMerge(resolved as unknown as Record<string, unknown>, componentOverride as unknown as Record<string, unknown>) as unknown as AccessibilityProfile;
  }

  return resolved;
}
