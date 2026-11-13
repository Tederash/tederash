import * as React from "react";
import {
  Locale,
  LocalizationDictionary,
  TextDirection,
  TranslationParams,
  TypographyProfile,
  getDictionary,
  getTypographyForLocale,
  translate,
} from "@tederash/core";
import { useAccessibility } from "./useAccessibility";

export interface UseLocaleResult {
  /** Active locale tag, e.g. 'en', 'am' */
  locale: string;
  /** Text direction for the active locale */
  direction: TextDirection;
  /** Resolved localization dictionary for the active locale */
  dictionary: LocalizationDictionary;
  /** Typography tokens resolved for the active locale */
  typography: TypographyProfile;
  /** Translate a dot-notated key, e.g. t("labels.email") */
  t: (key: string, params?: TranslationParams) => string;
  /** Switch the active locale (also updates the speech language tag) */
  setLocale: (locale: Locale) => void;
}

/**
 * React hook exposing the active locale, translation helper, and typography
 * tokens. Locale changes apply instantly without a page reload.
 */
export function useLocale(): UseLocaleResult {
  const { profile, updatePreferences } = useAccessibility();

  const locale = profile.locale ?? "en";

  const dictionary = React.useMemo(() => getDictionary(locale), [locale]);
  const typography = React.useMemo(
    () => getTypographyForLocale(locale),
    [locale]
  );

  const t = React.useCallback(
    (key: string, params?: TranslationParams) =>
      translate(dictionary, key, params),
    [dictionary]
  );

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      updatePreferences({
        locale: nextLocale,
        speech: { language: getDictionary(nextLocale).speechTag },
      });
    },
    [updatePreferences]
  );

  return {
    locale,
    direction: dictionary.direction,
    dictionary,
    typography,
    t,
    setLocale,
  };
}
