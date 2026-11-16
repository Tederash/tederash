import {
  PROFILE_KEYS,
  isProfileKey,
  matchProfileField,
  profileFieldByKey,
} from '../../../shared/profile';

/**
 * The user's saved profile, as the agent sees it.
 *
 * The values are never put in the model's context: the model writes a
 * `{{saved:email}}` placeholder and the orchestrator swaps in the real value here,
 * on this device, just before the field is filled. The field list itself lives in
 * shared/profile.ts, which the profile form is built from too.
 */
export const SAVED_DETAIL_KEYS = PROFILE_KEYS;

const PLACEHOLDER = /\{\{\s*saved:\s*([A-Za-z]+)\s*\}\}/g;

/** Lists which details are saved — names only, never the values. */
export function formatSavedDetails(vault: Record<string, string>): string | undefined {
  const known = SAVED_DETAIL_KEYS.filter((key) => vault[key]?.trim());
  if (known.length === 0) return undefined;
  return known
    .map((key) => {
      const label = profileFieldByKey(key)?.label.toLowerCase();
      return label ? `${key} (${label})` : key;
    })
    .join(', ');
}

export interface SubstitutionResult {
  value: string;
  /** A saved value was swapped in, so the text is the user's own, not the model's. */
  usedSaved: boolean;
  /** Placeholders that name something not saved; the model must not guess. */
  unknown: string[];
}

export function substituteSavedDetails(
  value: string,
  vault: Record<string, string>
): SubstitutionResult {
  const unknown: string[] = [];
  let usedSaved = false;

  const substituted = value.replace(PLACEHOLDER, (match, rawKey: string) => {
    const saved = isProfileKey(rawKey) ? vault[rawKey]?.trim() : undefined;
    if (!saved) {
      unknown.push(rawKey);
      return match;
    }
    usedSaved = true;
    return saved;
  });

  return { value: substituted, usedSaved, unknown };
}

/** True when any `{{saved:…}}` placeholder is still present (never fill that into a page). */
export function hasPlaceholder(value: string): boolean {
  return new RegExp(PLACEHOLDER.source).test(value);
}

/** Which saved detail a page field is asking for, if any. */
export function classifySavedDetail(label: string, kind?: string): string | undefined {
  return matchProfileField(label, kind)?.key;
}
