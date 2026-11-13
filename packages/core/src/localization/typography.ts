/**
 * Ge'ez (Ethiopic) typography engine.
 * Ethiopic scripts render smaller at equal point sizes and have tall stacked
 * diacritics, so line-height must be compensated (1.6-1.8) to prevent clipping.
 */

import { TextDirection } from "./types";

export interface TypographyProfile {
  /** CSS font-family stack for this script */
  fontFamily: string;
  /** Minimum comfortable line-height for the script */
  lineHeight: number;
  /** Text direction */
  direction: TextDirection;
}

export const LATIN_TYPOGRAPHY: TypographyProfile = {
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  lineHeight: 1.5,
  direction: "ltr",
};

export const ETHIOPIC_TYPOGRAPHY: TypographyProfile = {
  fontFamily:
    "'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', 'Power Ge-ez', sans-serif",
  lineHeight: 1.8,
  direction: "ltr",
};

/** True when the locale uses the Ge'ez (Ethiopic) script, e.g. 'am', 'am-ET' */
export function isEthiopicLocale(locale?: string): boolean {
  return (
    typeof locale === "string" &&
    locale.trim().toLowerCase().startsWith("am")
  );
}

/** Resolve typography tokens for a locale, defaulting to Latin typography */
export function getTypographyForLocale(locale?: string): TypographyProfile {
  return isEthiopicLocale(locale) ? ETHIOPIC_TYPOGRAPHY : LATIN_TYPOGRAPHY;
}

/** CSS variable representation of a typography profile */
export function getTypographyCssVariables(
  typography: TypographyProfile
): Record<string, string> {
  return {
    "--a11y-font-family": typography.fontFamily,
    "--a11y-line-height": `${typography.lineHeight}`,
  };
}
