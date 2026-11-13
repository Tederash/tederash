import { Locale, LocalizationDictionary, TranslationParams } from "../types";
import { ENGLISH_DICTIONARY } from "./en";
import { AMHARIC_DICTIONARY } from "./am";

export { ENGLISH_DICTIONARY } from "./en";
export { AMHARIC_DICTIONARY } from "./am";

export const DICTIONARIES: Record<Locale, LocalizationDictionary> = {
  en: ENGLISH_DICTIONARY,
  am: AMHARIC_DICTIONARY,
};

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Resolve the dictionary for a locale. Unknown or missing locales fall back
 * to the English dictionary so lookups never fail.
 */
export function getDictionary(locale?: string): LocalizationDictionary {
  const normalized = locale?.trim().toLowerCase() ?? "";
  const base = normalized.split("-")[0] as Locale;
  return DICTIONARIES[base] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Interpolate "{param}" placeholders in a translated string */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

/**
 * Look up a dot-notated key ("labels.email", "errors.required") in the
 * dictionary's translation sections. Falls back to the key itself when the
 * entry is missing, so callers can always render something meaningful.
 */
export function translate(
  dictionary: LocalizationDictionary,
  key: string,
  params?: TranslationParams
): string {
  const [section, ...rest] = key.split(".");
  const entryKey = rest.join(".");
  const sections: Record<string, Record<string, string> | undefined> = {
    labels: dictionary.translations.labels,
    errors: dictionary.translations.errors,
    announcements: dictionary.translations.announcements,
    presets: dictionary.translations.presets,
  };

  const entry = sections[section]?.[entryKey];
  return entry !== undefined ? interpolate(entry, params) : key;
}
