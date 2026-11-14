import { z } from 'zod';

export const ExperienceIdSchema = z.enum([
  'read_see',
  'hands_free',
  'calm_clear',
  'reading_support',
  'sound_aware',
  'guided_forms',
]);

export type ExperienceId = z.infer<typeof ExperienceIdSchema>;

export const PresetIdSchema = z.enum([
  'low_vision',
  'motor',
  'deaf_hoh',
  'cognitive',
  'dyslexia',
  'custom',
]);

export const ThemeModeSchema = z.enum(['default', 'light', 'dark', 'high-contrast']);

export const AiModeSchema = z.enum(['off', 'on_device', 'cloud']);

export const LlmProviderIdSchema = z.enum([
  'groq',
  'openai',
  'anthropic',
  'proxy',
  'chrome-builtin',
]);

export const VerbosityLevelSchema = z.enum(['minimal', 'normal', 'detailed']);

export const FrequentControlKeySchema = z.enum([
  'textScale',
  'contrastTheme',
  'readingRuler',
  'lineSpacing',
  'largeTargets',
  'reduceMotion',
]);

export const AdaptationSettingsSchema = z.object({
  enabled: z.boolean(),
  textScale: z.number().min(0.8).max(2.5),
  reflowSafe: z.boolean(),
  lineHeight: z.number().min(1.0).max(2.5),
  letterSpacingEm: z.number().min(0).max(0.25),
  wordSpacingEm: z.number().min(0).max(0.5),
  paragraphSpacingEm: z.number().min(0).max(3.0),
  fontFamily: z.enum(['site', 'sans', 'dyslexic']),
  contrastTheme: ThemeModeSchema,
  largeTargets: z.boolean(),
  focusHighlight: z.boolean(),
  readingRuler: z.boolean(),
  paragraphFocus: z.boolean(),
  reduceMotion: z.boolean(),
  hideDistractions: z.boolean(),
  fixMissingLabels: z.boolean(),
});

export type AdaptationSettings = z.infer<typeof AdaptationSettingsSchema>;

export const VoiceSettingsSchema = z.object({
  enabled: z.boolean(),
  wakeMode: z.enum(['push_to_talk', 'toggle', 'hotword']),
  language: z.string().min(2).max(16),
  ttsRate: z.number().min(0.5).max(2.5),
  ttsPitch: z.number().min(0.5).max(2.0),
  ttsVoiceName: z.string().optional(),
  verbosity: VerbosityLevelSchema,
  feedbackMode: z.enum(['spoken_visual', 'visual_earcon', 'visual_only']),
});

export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;

export const AssistantUiSettingsSchema = z.object({
  showFloatingButton: z.boolean(),
  dockPosition: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
  extensionTheme: z.enum(['system', 'light', 'dark', 'high-contrast']),
  frequentControls: z.array(FrequentControlKeySchema).max(4),
});

export type AssistantUiSettings = z.infer<typeof AssistantUiSettingsSchema>;

export const PrivacySettingsSchema = z.object({
  aiMode: AiModeSchema,
  provider: LlmProviderIdSchema,
  modelTier: z.enum(['fast', 'capable']),
  excludedOrigins: z.array(z.string()),
  redactEmailsAndPhones: z.boolean(),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

export const EffectiveSettingsSchema = z.object({
  disabledOnSite: z.boolean(),
  adaptation: AdaptationSettingsSchema,
  voice: VoiceSettingsSchema,
  ui: AssistantUiSettingsSchema,
  privacy: PrivacySettingsSchema,
});

export type EffectiveSettings = z.infer<typeof EffectiveSettingsSchema>;

export const SettingsPatchSchema = z.object({
  disabledOnSite: z.boolean().optional(),
  adaptation: AdaptationSettingsSchema.partial().optional(),
  voice: VoiceSettingsSchema.partial().optional(),
  ui: AssistantUiSettingsSchema.partial().optional(),
  privacy: PrivacySettingsSchema.partial().optional(),
});

export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  presetId: PresetIdSchema,
  experiences: z.array(ExperienceIdSchema),
  patch: SettingsPatchSchema,
  updatedAt: z.number(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const PersistedStateSchema = z.object({
  schemaVersion: z.literal(1),
  onboardingCompleted: z.boolean(),
  activeProfileId: z.string().min(1),
  profiles: z.array(ProfileSchema),
  globalPatch: SettingsPatchSchema,
  siteOverrides: z.record(z.string(), SettingsPatchSchema),
});

export type PersistedState = z.infer<typeof PersistedStateSchema>;
