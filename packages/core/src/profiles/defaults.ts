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
    visualNotifications: true,
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
    "Voice dictation and read-aloud on fields that support them (developers opt fields in with the speechInput / speechOutput props).",
  version: 1,
  speech: {
    speechInput: true,
    speechOutput: true,
  },
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

export const TEDERASH_PRESETS: TederashProfile[] = [
  DEFAULT_TEDERASH_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  COGNITIVE_ASSIST_PRESET,
  REDUCED_MOTION_PRESET,
  KEYBOARD_FIRST_PRESET,
  VOICE_ASSIST_PRESET,
  AMHARIC_PRESET,
];

export const PRESET_PROFILES = TEDERASH_PRESETS;
export const defaultTederashProfile = DEFAULT_TEDERASH_PROFILE;
export const defaultAccessibilityProfile = DEFAULT_TEDERASH_PROFILE;
