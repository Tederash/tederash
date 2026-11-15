import { describe, expect, it } from "vitest";
import {
  AMHARIC_DICTIONARY,
  AMHARIC_PRESET,
  DEFAULT_PROFILE,
  ENGLISH_DICTIONARY,
  OROMO_DICTIONARY,
  OROMO_PRESET,
  DEFAULT_LOCALE,
  ETHIOPIC_TYPOGRAPHY,
  LATIN_TYPOGRAPHY,
  PRESET_PROFILES,
  getDictionary,
  getTypographyCssVariables,
  getTypographyForLocale,
  isEthiopicLocale,
  resolveAdaptations,
  sanitizeProfile,
  translate,
  validateProfile,
} from "../src";

describe("Localization dictionary schema", () => {
  it("exposes the default locale as English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(ENGLISH_DICTIONARY.locale).toBe("en");
    expect(ENGLISH_DICTIONARY.name).toBe("English");
    expect(ENGLISH_DICTIONARY.direction).toBe("ltr");
    expect(ENGLISH_DICTIONARY.speechTag).toBe("en-US");
  });

  it("provides a complete Amharic dictionary with matching structure", () => {
    expect(AMHARIC_DICTIONARY.locale).toBe("am");
    expect(AMHARIC_DICTIONARY.name).toBe("አማርኛ");
    expect(AMHARIC_DICTIONARY.speechTag).toBe("am-ET");

    const enSections = Object.keys(ENGLISH_DICTIONARY.translations);
    const amSections = Object.keys(AMHARIC_DICTIONARY.translations);
    expect(amSections).toEqual(enSections);

    // Every Amharic section has the same keys as English
    for (const section of enSections as Array<keyof typeof ENGLISH_DICTIONARY.translations>) {
      expect(Object.keys(AMHARIC_DICTIONARY.translations[section]).sort()).toEqual(
        Object.keys(ENGLISH_DICTIONARY.translations[section]).sort()
      );
    }
  });

  it("provides a complete Oromo dictionary with matching structure", () => {
    expect(OROMO_DICTIONARY.locale).toBe("om");
    expect(OROMO_DICTIONARY.name).toBe("Afaan Oromoo");
    expect(OROMO_DICTIONARY.direction).toBe("ltr");
    expect(OROMO_DICTIONARY.speechTag).toBe("om-ET");

    const enSections = Object.keys(ENGLISH_DICTIONARY.translations);
    const omSections = Object.keys(OROMO_DICTIONARY.translations);
    expect(omSections).toEqual(enSections);

    // Every Oromo section has the same keys as English
    for (const section of enSections as Array<keyof typeof ENGLISH_DICTIONARY.translations>) {
      expect(Object.keys(OROMO_DICTIONARY.translations[section]).sort()).toEqual(
        Object.keys(ENGLISH_DICTIONARY.translations[section]).sort()
      );
    }
  });

  it("looks up dot-notated keys per section", () => {
    expect(translate(ENGLISH_DICTIONARY, "labels.email")).toBe(
      "Email address"
    );
    expect(translate(AMHARIC_DICTIONARY, "labels.email")).toBe(
      "የኢሜይል አድራሻ"
    );
    expect(translate(OROMO_DICTIONARY, "labels.email")).toBe(
      "Teessoo iimeelii"
    );
    expect(translate(AMHARIC_DICTIONARY, "errors.required", { field: "ስም" })).toBe(
      "ስም ያስፈልጋል።"
    );
    expect(translate(OROMO_DICTIONARY, "errors.required", { field: "Maqaa" })).toBe(
      "Maqaa barbaachisaadha."
    );
  });

  it("interpolates numeric params", () => {
    expect(
      translate(ENGLISH_DICTIONARY, "errors.weakPassword", { min: 8 })
    ).toBe("Your password must be at least 8 characters long.");
  });

  it("falls back to the raw key when a translation is missing", () => {
    expect(translate(ENGLISH_DICTIONARY, "labels.doesNotExist")).toBe(
      "labels.doesNotExist"
    );
  });
});

describe("Dictionary resolution & fallback", () => {
  it("resolves dictionaries by locale tag including region subtags", () => {
    expect(getDictionary("am")).toBe(AMHARIC_DICTIONARY);
    expect(getDictionary("am-ET")).toBe(AMHARIC_DICTIONARY);
    expect(getDictionary("om")).toBe(OROMO_DICTIONARY);
    expect(getDictionary("om-ET")).toBe(OROMO_DICTIONARY);
    expect(getDictionary("en")).toBe(ENGLISH_DICTIONARY);
    expect(getDictionary("en-GB")).toBe(ENGLISH_DICTIONARY);
  });

  it("falls back to English for unknown or missing locales", () => {
    expect(getDictionary(undefined)).toBe(ENGLISH_DICTIONARY);
    expect(getDictionary("fr")).toBe(ENGLISH_DICTIONARY);
    expect(getDictionary("")).toBe(ENGLISH_DICTIONARY);
  });
});

describe("Ge'ez typography engine", () => {
  it("detects Ethiopic locales", () => {
    expect(isEthiopicLocale("am")).toBe(true);
    expect(isEthiopicLocale("am-ET")).toBe(true);
    expect(isEthiopicLocale("en")).toBe(false);
    expect(isEthiopicLocale(undefined)).toBe(false);
  });

  it("compensates line-height between 1.6 and 1.8 for Ethiopic", () => {
    expect(ETHIOPIC_TYPOGRAPHY.lineHeight).toBeGreaterThanOrEqual(1.6);
    expect(ETHIOPIC_TYPOGRAPHY.lineHeight).toBeLessThanOrEqual(1.8);
    expect(ETHIOPIC_TYPOGRAPHY.lineHeight).toBeGreaterThan(
      LATIN_TYPOGRAPHY.lineHeight
    );
  });

  it("uses Ethiopic font fallbacks", () => {
    expect(ETHIOPIC_TYPOGRAPHY.fontFamily).toContain("Noto Sans Ethiopic");
    expect(ETHIOPIC_TYPOGRAPHY.fontFamily).toContain("Abyssinica SIL");
  });

  it("resolves typography per locale", () => {
    expect(getTypographyForLocale("am")).toBe(ETHIOPIC_TYPOGRAPHY);
    expect(getTypographyForLocale("en")).toBe(LATIN_TYPOGRAPHY);
    expect(getTypographyForLocale(undefined)).toBe(LATIN_TYPOGRAPHY);
  });

  it("exposes typography tokens as CSS variables", () => {
    const vars = getTypographyCssVariables(ETHIOPIC_TYPOGRAPHY);
    expect(vars["--a11y-font-family"]).toContain("Noto Sans Ethiopic");
    expect(vars["--a11y-line-height"]).toBe(
      `${ETHIOPIC_TYPOGRAPHY.lineHeight}`
    );
  });
});

describe("AMHARIC_PRESET profile", () => {
  it("validates as an accessibility profile", () => {
    expect(validateProfile(AMHARIC_PRESET).valid).toBe(true);
    expect(PRESET_PROFILES).toContain(AMHARIC_PRESET);
  });

  it("uses the Amharic locale and speech language", () => {
    expect(AMHARIC_PRESET.locale).toBe("am");
    expect(AMHARIC_PRESET.speech?.language).toBe("am-ET");
  });

  it("is preserved through sanitization", () => {
    const sanitized = sanitizeProfile(AMHARIC_PRESET);
    expect(sanitized.locale).toBe("am");
    expect(sanitized.speech?.language).toBe("am-ET");
  });
});

describe("Adaptation engine typography injection", () => {
  it("keeps default (Latin) typography out of CSS variables", () => {
    const adaptations = resolveAdaptations(DEFAULT_PROFILE);
    expect(adaptations.locale).toBe("en");
    expect(adaptations.typography).toBe(LATIN_TYPOGRAPHY);
    expect(adaptations.cssVariables["--a11y-font-family"]).toBeUndefined();
    expect(adaptations.cssVariables["--a11y-line-height"]).toBeUndefined();
    expect(adaptations.dataAttributes["data-a11y-locale"]).toBe("en");
  });

  it("injects Ge'ez typography tokens for the Amharic preset", () => {
    const adaptations = resolveAdaptations(AMHARIC_PRESET);
    expect(adaptations.locale).toBe("am");
    expect(adaptations.typography).toBe(ETHIOPIC_TYPOGRAPHY);
    expect(adaptations.cssVariables["--a11y-font-family"]).toContain(
      "Noto Sans Ethiopic"
    );
    expect(adaptations.cssVariables["--a11y-line-height"]).toBe("1.8");
    expect(adaptations.dataAttributes["data-a11y-locale"]).toBe("am");
  });

  it("rejects an invalid locale in profile validation", () => {
    const result = validateProfile({
      id: "bad-locale",
      name: "Bad Locale",
      locale: 42,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("locale"))).toBe(true);
  });
});
