import type { EffectiveSettings, PersistedState, Profile } from './schema';

export const BUILTIN_DEFAULTS: EffectiveSettings = {
  disabledOnSite: false,
  adaptation: {
    enabled: true,
    textScale: 1.0,
    reflowSafe: true,
    lineHeight: 1.5,
    letterSpacingEm: 0,
    wordSpacingEm: 0,
    paragraphSpacingEm: 1.0,
    fontFamily: 'site',
    contrastTheme: 'default',
    largeTargets: false,
    focusHighlight: true,
    readingRuler: false,
    paragraphFocus: false,
    reduceMotion: false,
    hideDistractions: false,
    fixMissingLabels: false,
  },
  voice: {
    enabled: true,
    wakeMode: 'toggle',
    language: 'en-US',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    verbosity: 'normal',
    feedbackMode: 'spoken_visual',
  },
  ui: {
    showFloatingButton: true,
    dockPosition: 'bottom-right',
    extensionTheme: 'system',
    frequentControls: ['textScale', 'contrastTheme', 'readingRuler', 'largeTargets'],
  },
  privacy: {
    aiMode: 'off',
    provider: 'groq',
    modelTier: 'fast',
    excludedOrigins: [],
    redactEmailsAndPhones: true,
  },
};

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'low-vision',
    name: 'Low vision',
    presetId: 'low_vision',
    experiences: ['read_see'],
    patch: {
      adaptation: {
        textScale: 1.25,
        contrastTheme: 'high-contrast',
        focusHighlight: true,
        readingRuler: true,
      },
    },
    updatedAt: 0,
  },
  {
    id: 'motor',
    name: 'Motor & hands-free',
    presetId: 'motor',
    experiences: ['hands_free', 'guided_forms'],
    patch: {
      adaptation: {
        largeTargets: true,
        focusHighlight: true,
      },
      voice: {
        enabled: true,
        wakeMode: 'toggle',
      },
    },
    updatedAt: 0,
  },
  {
    id: 'cognitive',
    name: 'Cognitive support',
    presetId: 'cognitive',
    experiences: ['calm_clear', 'guided_forms'],
    patch: {
      adaptation: {
        hideDistractions: true,
        reduceMotion: true,
        paragraphFocus: true,
      },
    },
    updatedAt: 0,
  },
  {
    id: 'dyslexia',
    name: 'Dyslexia',
    presetId: 'dyslexia',
    experiences: ['reading_support', 'read_see'],
    patch: {
      adaptation: {
        fontFamily: 'dyslexic',
        lineHeight: 1.75,
        letterSpacingEm: 0.06,
        wordSpacingEm: 0.12,
        readingRuler: true,
      },
    },
    updatedAt: 0,
  },
  {
    id: 'deaf-hoh',
    name: 'Deaf / Hard of hearing',
    presetId: 'deaf_hoh',
    experiences: ['sound_aware'],
    patch: {
      voice: {
        feedbackMode: 'visual_only',
      },
    },
    updatedAt: 0,
  },
  {
    id: 'custom',
    name: 'Custom',
    presetId: 'custom',
    experiences: [],
    patch: {},
    updatedAt: 0,
  },
];

export function createInitialPersistedState(): PersistedState {
  return {
    schemaVersion: 1,
    onboardingCompleted: false,
    activeProfileId: 'custom',
    profiles: DEFAULT_PROFILES,
    globalPatch: {},
    siteOverrides: {},
  };
}
