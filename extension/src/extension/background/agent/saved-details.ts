import type { PageFieldKind } from '../../../shared/tools';

/**
 * The personal details the assistant may remember between sessions, so it stops
 * asking for the same things on every form.
 *
 * The values themselves are never put in the model's context: the model writes a
 * `{{saved:email}}` placeholder and the orchestrator swaps in the real value here,
 * on this device, just before the field is filled.
 */
export const SAVED_DETAIL_KEYS = ['fullName', 'email', 'phone', 'address'] as const;
export type SavedDetailKey = (typeof SAVED_DETAIL_KEYS)[number];

export const SAVED_DETAIL_LABELS: Record<SavedDetailKey, string> = {
  fullName: 'full name',
  email: 'email address',
  phone: 'phone number',
  address: 'postal address',
};

const PLACEHOLDER = /\{\{\s*saved:\s*([A-Za-z]+)\s*\}\}/g;

function isSavedDetailKey(value: string): value is SavedDetailKey {
  return (SAVED_DETAIL_KEYS as readonly string[]).includes(value);
}

/** Lists which details are saved — names only, never the values. */
export function formatSavedDetails(vault: Record<string, string>): string | undefined {
  const known = SAVED_DETAIL_KEYS.filter((key) => vault[key]?.trim());
  if (known.length === 0) return undefined;
  return known.map((key) => `${key} (the user's ${SAVED_DETAIL_LABELS[key]})`).join(', ');
}

export interface SubstitutionResult {
  value: string;
  /** A saved value was swapped in, so the text is the user's own, not the model's. */
  usedSaved: boolean;
  /** Placeholders that name something not saved; the model must ask instead. */
  unknown: string[];
}

export function substituteSavedDetails(
  value: string,
  vault: Record<string, string>
): SubstitutionResult {
  const unknown: string[] = [];
  let usedSaved = false;

  const substituted = value.replace(PLACEHOLDER, (match, rawKey: string) => {
    const key = isSavedDetailKey(rawKey) ? rawKey : undefined;
    const saved = key ? vault[key]?.trim() : undefined;
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

interface Matcher {
  key: SavedDetailKey;
  kinds?: PageFieldKind[];
  test: RegExp;
}

/**
 * Order matters: "Email Address" is an email, not an address.
 *
 * Only whole-name labels map to `fullName`. A form with separate First/Last name
 * boxes is asked about instead — splitting a full name is not safe to guess, and
 * is wrong for naming systems that use a father's name rather than a surname.
 */
const MATCHERS: Matcher[] = [
  { key: 'email', kinds: ['email'], test: /\be-?mails?\b/ },
  { key: 'phone', kinds: ['tel'], test: /\b(phone|telephone|mobile|cell)\b/ },
  { key: 'address', test: /\b(street|postal address|home address|mailing address|address)\b/ },
  { key: 'fullName', test: /\b((full|legal|given|your)\s+name|name)\b/ },
];

const NAME_EXCLUSIONS = /\b(user|company|employer|organisation|organization|school|file|product|role|job|project|account|business|pet|first|last|family|sur|middle|maiden)[\s-]*name\b/;

/** Which saved detail a field is asking for, if any. */
export function classifySavedDetail(label: string, kind?: PageFieldKind): SavedDetailKey | undefined {
  const text = label.toLowerCase().trim();
  if (!text) return undefined;

  for (const matcher of MATCHERS) {
    if (matcher.kinds?.includes(kind as PageFieldKind)) return matcher.key;
    if (!matcher.test.test(text)) continue;
    if (matcher.key === 'fullName' && NAME_EXCLUSIONS.test(text)) continue;
    return matcher.key;
  }
  return undefined;
}
