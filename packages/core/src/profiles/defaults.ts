import { AccessibilityProfile, TederashProfile } from "./types";

export const DEFAULT_TEDERASH_PROFILE: TederashProfile = {
  id: "standard",
  name: "Standard",
  description: "Standard application settings with baseline accessible behavior.",
  version: 1,
  locale: "en",
  visual: {
    fontScale: 1.0,
    highContrast: false,
    colorScheme: "system",
    reduceVisualClutter: false,
    underlineLinks: false,
    reduceMotion: false,
  },
  motor: {
    targetSize: "normal",
    keyboardNavigation: false,
    reducePrecisionRequired: false,
    extendedHoverDelay: false,
  },
  cognitive: {
    simplifiedLanguage: false,
    guidedInteraction: false,
    reduceDistractions: false,
    showInstructions: false,
    readingFocusGuide: false,
  },
  auditory: {
    captionsEnabled: false,
    // Opt-in: when on, every announcement also shows a longer-lasting on-screen banner.
    visualNotifications: false,
  },
  speech: {
    speechOutput: false,
    speechInput: false,
    language: "en-US",
    speechRate: 1.0,
  },
  interaction: {
    preferredInput: "pointer",
    confirmationBeforeDestructiveActions: true,
    formAssistance: true,
  },
};

export const DEFAULT_PROFILE = DEFAULT_TEDERASH_PROFILE;

export const LOW_VISION_PRESET: TederashProfile = {
  id: "low-vision",
  name: "Low Vision & High Contrast",
  description: "Enhanced text size, high contrast borders, and underlined interactive links.",
  version: 1,
  visual: {
    fontScale: 1.35,
    highContrast: true,
    colorScheme: "system",
    reduceVisualClutter: true,
    underlineLinks: true,
    reduceMotion: false,
  },
  motor: {
    targetSize: "large",
    keyboardNavigation: false,
    reducePrecisionRequired: true,
  },
  cognitive: {
    showInstructions: true,
  },
  interaction: {
    confirmationBeforeDestructiveActions: true,
  },
};

export const MOTOR_ASSIST_PRESET: TederashProfile = {
  id: "motor-assist",
  name: "Motor & Target Sizing",
  description: "Extra large interactive touch targets, relaxed precision, and high-visibility keyboard focus.",
  version: 1,
  visual: {
    fontScale: 1.1,
    reduceMotion: true,
  },
  motor: {
    targetSize: "extra-large",
    keyboardNavigation: true,
    reducePrecisionRequired: true,
    extendedHoverDelay: true,
  },
  cognitive: {
    reduceDistractions: true,
  },
  interaction: {
    preferredInput: "pointer",
    confirmationBeforeDestructiveActions: true,
  },
};

export const COGNITIVE_ASSIST_PRESET: TederashProfile = {
  id: "cognitive-assist",
  name: "Cognitive & Reading Guidance",
  description: "Plain language instructions, minimal distractions, guided form workflows, and inline hints.",
  version: 1,
  visual: {
    fontScale: 1.15,
    reduceVisualClutter: true,
    reduceMotion: true,
    underlineLinks: true,
  },
  cognitive: {
    simplifiedLanguage: true,
    guidedInteraction: true,
    reduceDistractions: true,
    showInstructions: true,
    readingFocusGuide: true,
  },
  interaction: {
    formAssistance: true,
    confirmationBeforeDestructiveActions: true,
  },
};

export const REDUCED_MOTION_PRESET: TederashProfile = {
  id: "reduced-motion",
  name: "Reduced Motion",
  description: "Disables unnecessary animations, transitions, and moving page elements.",
  version: 1,
  visual: {
    reduceMotion: true,
    reduceVisualClutter: true,
  },
  cognitive: {
    reduceDistractions: true,
  },
};

export const KEYBOARD_FIRST_PRESET: TederashProfile = {
  id: "keyboard-first",
  name: "Keyboard Navigation",
  description: "Strongest focus indicators, keyboard shortcuts, and keyboard-oriented form flow.",
  version: 1,
  motor: {
    keyboardNavigation: true,
    targetSize: "large",
  },
  interaction: {
    preferredInput: "keyboard",
    confirmationBeforeDestructiveActions: true,
  },
};

export const VOICE_ASSIST_PRESET: TederashProfile = {
  id: "voice-assist",
  name: "Voice Assistance",
  description:
    "Speak into form fields and have instructions read aloud, where the page supports it.",
  version: 1,
  speech: {
    speechInput: true,
    speechOutput: true,
  },
};

/**
 * For people using their own screen reader (NVDA, JAWS, VoiceOver, TalkBack).
 * The page does not speak itself, so nothing is heard twice.
 */
export const SCREEN_READER_PRESET: TederashProfile = {
  id: "screen-reader",
  name: "Screen Reader",
  description:
    "Works with your own screen reader: clear instructions, strong keyboard focus, confirmations, and voice input. The page stays silent so nothing is read twice.",
  version: 1,
  motor: { keyboardNavigation: true },
  cognitive: { showInstructions: true },
  speech: { speechInput: true, speechOutput: false },
  interaction: { preferredInput: "keyboard", confirmationBeforeDestructiveActions: true },
};

/**
 * For people who are blind or partially sighted and do not use a screen
 * reader: speech plus moderately larger text and targets for any remaining sight.
 */
export const READ_ALOUD_PRESET: TederashProfile = {
  id: "read-aloud",
  name: "Read Aloud",
  description:
    "The page reads status messages and field instructions aloud, with larger text and buttons, voice input, strong keyboard focus and confirmations. For use without a screen reader.",
  version: 1,
  visual: { fontScale: 1.25, underlineLinks: true },
  motor: { keyboardNavigation: true, targetSize: "large" },
  cognitive: { showInstructions: true },
  speech: { speechInput: true, speechOutput: true, speechRate: 1 },
  interaction: { preferredInput: "keyboard", confirmationBeforeDestructiveActions: true },
};

/** For people who cannot rely on sound. */
export const VISUAL_ALERTS_PRESET: TederashProfile = {
  id: "visual-alerts",
  name: "Visual Alerts",
  description:
    "Nothing depends on sound: every message appears on screen and stays longer, instructions are always shown, and captions are preferred.",
  version: 1,
  auditory: { visualNotifications: true, captionsEnabled: true },
  cognitive: { showInstructions: true },
  speech: { speechInput: false, speechOutput: false },
};

export const AMHARIC_PRESET: TederashProfile = {
  id: "amharic",
  name: "አማርኛ / Amharic",
  description:
    "Amharic locale with Ge'ez typography compensation, slightly larger text, and Amharic speech language.",
  version: 1,
  locale: "am",
  visual: {
    fontScale: 1.1,
  },
  cognitive: {
    showInstructions: true,
  },
  speech: {
    language: "am-ET",
    speechRate: 0.95,
  },
};

export const OROMO_PRESET: TederashProfile = {
  id: "oromo",
  name: "Afaan Oromoo / Oromo",
  description:
    "Afaan Oromoo locale with Latin Qubee typography, accessible touch targets, and Oromo speech language.",
  version: 1,
  locale: "om",
  visual: {
    fontScale: 1.05,
  },
  cognitive: {
    showInstructions: true,
  },
  speech: {
    language: "om-ET",
    speechRate: 1.0,
  },
};

export const TEDERASH_PRESETS: TederashProfile[] = [
  DEFAULT_TEDERASH_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  COGNITIVE_ASSIST_PRESET,
  REDUCED_MOTION_PRESET,
  KEYBOARD_FIRST_PRESET,
  VOICE_ASSIST_PRESET,
  SCREEN_READER_PRESET,
  READ_ALOUD_PRESET,
  VISUAL_ALERTS_PRESET,
  AMHARIC_PRESET,
  OROMO_PRESET,
];

export const PRESET_PROFILES = TEDERASH_PRESETS;
export const defaultTederashProfile = DEFAULT_TEDERASH_PROFILE;
export const defaultAccessibilityProfile = DEFAULT_TEDERASH_PROFILE;
