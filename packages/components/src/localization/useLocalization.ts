import * as React from "react";
import {
  TranslationParams,
  getDictionary,
  translate,
} from "@tederash/core";
import { useAccessibility } from "@tederash/react";

export interface UseLocalizationResult {
  /** Active locale tag, e.g. 'en', 'am' */
  locale: string;
  /** Translate a dot-notated key against the active locale's dictionary */
  t: (key: string, params?: TranslationParams) => string;
}

/**
 * Internal hook giving adaptive components access to localized strings for
 * the active accessibility profile locale. Component props with explicit
 * strings still take precedence over translated defaults.
 */
export function useLocalization(): UseLocalizationResult {
  const { profile } = useAccessibility();
  const locale = profile.locale ?? "en";

  const dictionary = React.useMemo(() => getDictionary(locale), [locale]);
  const t = React.useCallback(
    (key: string, params?: TranslationParams) =>
      translate(dictionary, key, params),
    [dictionary]
  );

  return { locale, t };
}
