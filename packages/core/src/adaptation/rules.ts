import { AccessibilityProfile } from "../profiles/types";
import { getTypographyForLocale, isEthiopicLocale, TypographyProfile } from "../localization/typography";
import { ComponentAdaptations } from "./types";

export function resolveAdaptations(profile: AccessibilityProfile): ComponentAdaptations {
  const fontScale = profile.visual?.fontScale ?? 1.0;
  const targetSize = profile.motor?.targetSize ?? "normal";
  const highContrast = Boolean(profile.visual?.highContrast);
  const reduceMotion = Boolean(profile.visual?.reduceMotion);
  const reduceVisualClutter = Boolean(profile.visual?.reduceVisualClutter);
  const underlineLinks = Boolean(profile.visual?.underlineLinks);
  const keyboardNavigation = Boolean(profile.motor?.keyboardNavigation);

  let minTargetHeight = "40px";
  let targetPadding = "0.5rem 1rem";

  if (targetSize === "large") {
    minTargetHeight = "48px";
    targetPadding = "0.75rem 1.25rem";
  } else if (targetSize === "extra-large") {
    minTargetHeight = "56px";
    targetPadding = "1rem 1.5rem";
  }

  let focusIndicator: "standard" | "enhanced" | "high-visibility" = "standard";
  if (highContrast || keyboardNavigation) {
    focusIndicator = "high-visibility";
  } else if (targetSize === "large" || targetSize === "extra-large") {
    focusIndicator = "enhanced";
  }

  const simplifiedLanguage = Boolean(profile.cognitive?.simplifiedLanguage);
  const guidedInteraction = Boolean(profile.cognitive?.guidedInteraction);
  const showInstructions = Boolean(profile.cognitive?.showInstructions);
  const readingFocusGuide = Boolean(profile.cognitive?.readingFocusGuide);

  const confirmationBeforeDestructiveActions =
    profile.interaction?.confirmationBeforeDestructiveActions !== false;

  const visualNotifications = Boolean(profile.auditory?.visualNotifications);
  const speechOutputEnabled = Boolean(profile.speech?.speechOutput);
  const speechInputEnabled = Boolean(profile.speech?.speechInput);
  const language = profile.speech?.language ?? "en-US";
  const locale = profile.locale ?? "en";

  const typography: TypographyProfile = getTypographyForLocale(locale);

  const cssVariables: Record<string, string> = {
    "--a11y-font-scale": `${fontScale}`,
    "--a11y-min-target-height": minTargetHeight,
    "--a11y-target-padding": targetPadding,
    "--a11y-focus-ring-width": focusIndicator === "high-visibility" ? "3px" : "2px",
    "--a11y-focus-ring-offset": "2px",
    "--a11y-transition-duration": reduceMotion ? "0ms" : "150ms",
  };

  const dataAttributes: Record<string, string> = {
    "data-a11y-target-size": targetSize,
    "data-a11y-high-contrast": highContrast ? "true" : "false",
    "data-a11y-reduce-motion": reduceMotion ? "true" : "false",
    "data-a11y-underline-links": underlineLinks ? "true" : "false",
    "data-a11y-focus-indicator": focusIndicator,
    "data-a11y-simplified": simplifiedLanguage ? "true" : "false",
    "data-a11y-guided": guidedInteraction ? "true" : "false",
    "data-a11y-visual-notifications": visualNotifications ? "true" : "false",
    "data-a11y-locale": locale,
  };

  // Inject Ge'ez typography tokens only when the locale requires them
  if (isEthiopicLocale(locale)) {
    cssVariables["--a11y-font-family"] = typography.fontFamily;
    cssVariables["--a11y-line-height"] = `${typography.lineHeight}`;
  }

  return {
    fontScale,
    minTargetHeight,
    targetPadding,
    targetSize,
    highContrast,
    reduceMotion,
    reduceVisualClutter,
    underlineLinks,
    focusIndicator,
    simplifiedLanguage,
    guidedInteraction,
    showInstructions,
    readingFocusGuide,
    confirmationBeforeDestructiveActions,
    visualNotifications,
    speechOutputEnabled,
    speechInputEnabled,
    language,
    locale,
    typography,
    cssVariables,
    dataAttributes,
  };
}
