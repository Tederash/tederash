export type ExperienceId =
  | 'read_see'
  | 'hands_free'
  | 'calm_clear'
  | 'reading_support'
  | 'sound_aware'
  | 'guided_forms';

export type PresetId =
  | 'low_vision'
  | 'motor'
  | 'deaf_hoh'
  | 'cognitive'
  | 'dyslexia'
  | 'custom';

export type ThemeMode = 'default' | 'light' | 'dark' | 'high-contrast';

export type AiMode = 'off' | 'on_device' | 'cloud';

export type LlmProviderId = 'groq' | 'openai' | 'anthropic' | 'proxy' | 'chrome-builtin';

export type VerbosityLevel = 'minimal' | 'normal' | 'detailed';

export type RiskLevel = 'none' | 'low' | 'consequential' | 'destructive' | 'blocked';

export type FrequentControlKey =
  | 'textScale'
  | 'contrastTheme'
  | 'readingRuler'
  | 'lineSpacing'
  | 'largeTargets'
  | 'reduceMotion';

export interface ActionOutcome {
  ok: boolean;
  errorCode?:
    | 'STALE_REF'
    | 'NOT_FOUND'
    | 'NOT_VISIBLE'
    | 'OCCLUDED'
    | 'DISABLED'
    | 'BLOCKED_BY_POLICY'
    | 'NEEDS_CONFIRMATION'
    | 'TIMEOUT'
    | 'INVALID_ARGS'
    | 'UNSUPPORTED'
    | 'CROSS_ORIGIN_FRAME'
    | 'USER_CANCELLED';
  domChanged: boolean;
  urlChanged: boolean;
  focusedRef?: string;
  newDialogs?: string[];
}
