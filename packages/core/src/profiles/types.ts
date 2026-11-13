/**
 * Accessibility Profile Types
 * Strongly-typed preference schema representing user requirements without disability labeling.
 */

export type ColorScheme = "light" | "dark" | "system";
export type TargetSize = "normal" | "large" | "extra-large";
export type PreferredInput = "pointer" | "keyboard" | "voice";

export interface VisualPreferences {
  /** Font scale factor relative to 1.0 (e.g., 1.0, 1.25, 1.5, 2.0). Range: 0.8 - 2.5 */
  fontScale?: number;
  /** High contrast colors and borders */
  highContrast?: boolean;
  /** Preferred color scheme */
  colorScheme?: ColorScheme;
  /** Minimize non-essential decorative elements */
  reduceVisualClutter?: boolean;
  /** Always display explicit underlines on hyperlinks */
  underlineLinks?: boolean;
  /** Reduce animations, transitions, and moving elements */
  reduceMotion?: boolean;
}

export interface MotorPreferences {
  /** Interactive touch and click target sizing: 'normal' (40px), 'large' (48px), 'extra-large' (56px+) */
  targetSize?: TargetSize;
  /** Optimize navigation and focus rings for keyboard-only operation */
  keyboardNavigation?: boolean;
  /** Provide larger hit margins and forgiving click targets */
  reducePrecisionRequired?: boolean;
  /** Extended dwell/click tolerance and click confirmation */
  extendedHoverDelay?: boolean;
}

export interface CognitivePreferences {
  /** Replace complex or jargon phrasing with simplified plain-language explanations */
  simplifiedLanguage?: boolean;
  /** Provide step-by-step guidance and prominent primary actions */
  guidedInteraction?: boolean;
  /** Reduce banners, alerts, and secondary distractions */
  reduceDistractions?: boolean;
  /** Always show inline helper instructions without requiring hover/focus */
  showInstructions?: boolean;
  /** Highlight active reading sections or fields */
  readingFocusGuide?: boolean;
}

export interface AuditoryPreferences {
  /** Enable closed captions for media elements */
  captionsEnabled?: boolean;
  /** Provide visible cues/flashes alongside audio feedback */
  visualNotifications?: boolean;
}

export interface SpeechPreferences {
  /** Spoken readouts of interface events and text-to-speech instructions */
  speechOutput?: boolean;
  /** Voice input / speech recognition for text fields */
  speechInput?: boolean;
  /** Language tag for speech synthesis and recognition (e.g. 'en-US', 'am-ET') */
  language?: string;
  /** Speech synthesis speed multiplier (e.g. 0.8 - 2.0) */
  speechRate?: number;
}

export interface InteractionPreferences {
  /** Preferred primary input modality */
  preferredInput?: PreferredInput;
  /** Require explicit confirmation modal/dialog before destructive or irrevocable actions */
  confirmationBeforeDestructiveActions?: boolean;
  /** Autocomplete and inline suggestions assistance */
  formAssistance?: boolean;
}

export interface TederashProfile {
  id: string;
  name: string;
  description?: string;
  version?: number;
  /** UI language / locale tag, e.g. 'en', 'am', 'am-ET' (drives localization & typography) */
  locale?: string;
  visual?: VisualPreferences;
  motor?: MotorPreferences;
  cognitive?: CognitivePreferences;
  auditory?: AuditoryPreferences;
  speech?: SpeechPreferences;
  interaction?: InteractionPreferences;
  /** Custom extensible properties */
  custom?: Record<string, unknown>;
}

/** Backward-compatible alias for TederashProfile */
export type AccessibilityProfile = TederashProfile;

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export type TederashPreferencesUpdate = DeepPartial<
  Omit<TederashProfile, "id" | "name">
>;

/** Backward-compatible alias for TederashPreferencesUpdate */
export type AccessibilityPreferencesUpdate = TederashPreferencesUpdate;
