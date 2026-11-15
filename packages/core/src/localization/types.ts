/**
 * Localization Types (Phase 8: Localization and Ethiopian Context)
 * Strongly-typed multilingual dictionary schema for English, Amharic, and Afaan Oromoo.
 */

export type Locale = "en" | "am" | "om";
export type TextDirection = "ltr" | "rtl";

/** Values interpolated into placeholders like "{field}" */
export type TranslationParams = Record<string, string | number>;

export interface LocalizationTranslations {
  /** UI and form field labels */
  labels: Record<string, string>;
  /** Validation and error messages */
  errors: Record<string, string>;
  /** Screen-reader and system announcements */
  announcements: Record<string, string>;
  /** Accessibility preset display names, keyed by preset id */
  presets: Record<string, string>;
}

export interface LocalizationDictionary {
  locale: Locale;
  /** Native language name, e.g. 'English', 'አማርኛ' */
  name: string;
  /** Text direction for this language */
  direction: TextDirection;
  /** Default speech language tag, e.g. 'en-US', 'am-ET' */
  speechTag: string;
  translations: LocalizationTranslations;
}
