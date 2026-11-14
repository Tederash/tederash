import { z } from 'zod';
import {
  EffectiveSettingsSchema,
  ExperienceIdSchema,
  ProfileSchema,
  SettingsPatchSchema,
} from './settings/schema';
import { ToolCallSchema } from './tools';

export const MessageVersionSchema = z.literal(1);

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'step';
  content: string;
  timestamp: number;
  toolCall?: { name: string; args: Record<string, unknown> };
  toolResult?: { ok: boolean; data?: unknown; error?: { message: string } };
  status?: 'pending' | 'running' | 'success' | 'error';
}

export interface AgentChatResponse {
  ok: boolean;
  conversationId: string;
  messages: ChatMessage[];
  status: 'idle' | 'running' | 'done' | 'error' | 'stopped';
  error?: string;
}

export interface AiConfig {
  provider: 'heuristic' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface ElementSnapshot {
  ref: string;
  tag: string;
  role?: string;
  name?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  checked?: boolean;
  disabled?: boolean;
  inViewport?: boolean;
}

export interface PageSnapshot {
  url: string;
  title: string;
  lang?: string;
  landmarks: string[];
  elements: ElementSnapshot[];
  headings: string[];
  textSample: string;
}

function makeEnvelopeSchema<T extends string, P extends z.ZodTypeAny>(type: T, payload: P) {
  return z.object({
    v: MessageVersionSchema,
    id: z.string().min(1),
    type: z.literal(type),
    payload,
    ts: z.number(),
  });
}

// UI -> Background Service Worker
export const SystemPingSchema = makeEnvelopeSchema('system/ping', z.object({}));
export const TabPingContentSchema = makeEnvelopeSchema(
  'tab/pingContent',
  z.object({ tabId: z.number().int().nonnegative() })
);
export const SettingsGetSchema = makeEnvelopeSchema(
  'settings/get',
  z.object({ origin: z.string().optional(), tabId: z.number().int().nonnegative().optional() })
);
export const SettingsUpdateSchema = makeEnvelopeSchema(
  'settings/update',
  z.object({
    scope: z.enum(['global', 'profile', 'site', 'session']),
    patch: SettingsPatchSchema,
    origin: z.string().optional(),
    tabId: z.number().int().nonnegative().optional(),
    profileId: z.string().optional(),
  })
);
export const SettingsSetProfileSchema = makeEnvelopeSchema(
  'settings/setProfile',
  z.object({
    profileId: z.string().min(1),
    origin: z.string().optional(),
    tabId: z.number().int().nonnegative().optional(),
  })
);
export const OnboardingCompleteSchema = makeEnvelopeSchema(
  'onboarding/complete',
  z.object({ completed: z.boolean() })
);
export const SitesDeleteSchema = makeEnvelopeSchema(
  'sites/delete',
  z.object({
    origin: z.string().min(1).refine((value) => {
      try {
        return Boolean(new URL(value).origin);
      } catch {
        return false;
      }
    }, 'origin must be a valid URL'),
  })
);
export const ProfilesCreateSchema = makeEnvelopeSchema(
  'profiles/create',
  z.object({
    name: z.string().min(1).max(64),
    experiences: z.array(ExperienceIdSchema).default([]),
    patch: SettingsPatchSchema.default({}),
    activate: z.boolean().default(true),
  })
);
export const VaultGetSchema = makeEnvelopeSchema('vault/get', z.object({}));
export const VaultSetSchema = makeEnvelopeSchema(
  'vault/set',
  z.object({ entries: z.record(z.string().max(64), z.string().max(2000)) })
);
export const TtsReadPageSchema = makeEnvelopeSchema(
  'tts/readPage',
  z.object({ tabId: z.number().int().nonnegative() })
);
export const TtsSpeakSchema = makeEnvelopeSchema(
  'tts/speak',
  z.object({ text: z.string().min(1).max(5000) })
);
export const TtsStopSchema = makeEnvelopeSchema('tts/stop', z.object({}));

// Background Service Worker -> Offscreen document (TTS fallback path)
export const OffscreenSpeakSchema = makeEnvelopeSchema(
  'offscreen/speak',
  z.object({
    text: z.string().min(1).max(8000),
    rate: z.number().min(0.5).max(2.5).optional(),
    pitch: z.number().min(0.5).max(2.0).optional(),
    lang: z.string().max(16).optional(),
  })
);
export const OffscreenStopSchema = makeEnvelopeSchema('offscreen/stop', z.object({}));

export const BgToOffscreenSchema = z.discriminatedUnion('type', [
  OffscreenSpeakSchema,
  OffscreenStopSchema,
]);

/** Every literal type handled by the offscreen document's lite parser. */
export const BG_TO_OFFSCREEN_TYPES = ['offscreen/speak', 'offscreen/stop'] as const;

export type BgToOffscreenMessage = z.infer<typeof BgToOffscreenSchema>;

export const AgentChatSchema = makeEnvelopeSchema(
  'agent/chat',
  z.object({
    tabId: z.number().int().nonnegative(),
    text: z.string().min(1).max(5000),
    conversationId: z.string().optional(),
  })
);

export const AgentGetHistorySchema = makeEnvelopeSchema(
  'agent/getHistory',
  z.object({ conversationId: z.string().optional() })
);

export const AgentClearHistorySchema = makeEnvelopeSchema(
  'agent/clearHistory',
  z.object({ conversationId: z.string().optional() })
);

export const AgentStopSchema = makeEnvelopeSchema(
  'agent/stop',
  z.object({ runId: z.string().optional() })
);

export const AiGetConfigSchema = makeEnvelopeSchema('ai/getConfig', z.object({}));

export const AiSetConfigSchema = makeEnvelopeSchema(
  'ai/setConfig',
  z.object({
    provider: z.enum(['heuristic', 'gemini', 'openai', 'anthropic', 'custom']),
    apiKey: z.string().max(300).optional(),
    model: z.string().max(100).optional(),
    baseUrl: z.string().max(300).optional(),
  })
);

export const UiToBgSchema = z.discriminatedUnion('type', [
  SystemPingSchema,
  TabPingContentSchema,
  SettingsGetSchema,
  SettingsUpdateSchema,
  SettingsSetProfileSchema,
  OnboardingCompleteSchema,
  SitesDeleteSchema,
  ProfilesCreateSchema,
  VaultGetSchema,
  VaultSetSchema,
  TtsReadPageSchema,
  TtsSpeakSchema,
  TtsStopSchema,
  AgentChatSchema,
  AgentGetHistorySchema,
  AgentClearHistorySchema,
  AgentStopSchema,
  AiGetConfigSchema,
  AiSetConfigSchema,
]);

export type UiToBgMessage = z.infer<typeof UiToBgSchema>;

// Background Service Worker -> Content Script
export const ContentPingSchema = makeEnvelopeSchema('content/ping', z.object({}));
export const AdaptApplySchema = makeEnvelopeSchema(
  'adapt/apply',
  z.object({ effective: EffectiveSettingsSchema })
);
export const AdaptRevertSchema = makeEnvelopeSchema('adapt/revert', z.object({}));
export const ReadingExtractSchema = makeEnvelopeSchema('reading/extract', z.object({}));
export const SnapshotRequestSchema = makeEnvelopeSchema(
  'snapshot/request',
  z.object({
    mode: z.enum(['interactive', 'content', 'form']).default('interactive').optional(),
    viewportOnly: z.boolean().default(false).optional(),
  })
);
export const ToolExecSchema = makeEnvelopeSchema(
  'tool/exec',
  z.object({ call: ToolCallSchema })
);

export const BgToContentSchema = z.discriminatedUnion('type', [
  ContentPingSchema,
  AdaptApplySchema,
  AdaptRevertSchema,
  ReadingExtractSchema,
  SnapshotRequestSchema,
  ToolExecSchema,
]);

/** Every literal type handled by the content script's lite parser (messages-lite.ts). */
export const BG_TO_CONTENT_TYPES = [
  'content/ping',
  'adapt/apply',
  'adapt/revert',
  'reading/extract',
  'snapshot/request',
  'tool/exec',
] as const;

export type BgToContentMessage = z.infer<typeof BgToContentSchema>;

// Content Script -> Background Service Worker
export const PageReadySchema = makeEnvelopeSchema(
  'page/ready',
  z.object({ url: z.string(), origin: z.string(), frameId: z.number().int().optional() })
);

export const ContentToBgSchema = z.discriminatedUnion('type', [PageReadySchema]);

export type ContentToBgMessage = z.infer<typeof ContentToBgSchema>;

// Response types
export const SettingsGetResponseSchema = z.object({
  ok: z.literal(true),
  effective: EffectiveSettingsSchema,
  activeProfileId: z.string(),
  profiles: z.array(ProfileSchema),
  onboardingCompleted: z.boolean(),
  siteOverrides: z.record(z.string(), SettingsPatchSchema).optional(),
  globalPatch: SettingsPatchSchema.optional(),
});

export type SettingsGetResponse = z.infer<typeof SettingsGetResponseSchema>;

export interface VaultGetResponse {
  ok: true;
  entries: Record<string, string>;
}

export interface TtsResponse {
  ok: boolean;
  error?: string;
  spoken?: boolean;
  chars?: number;
}

export interface PingResponse {
  ok: true;
  runtime: 'background' | 'content';
  ts: number;
  url?: string;
}

export { createEnvelope } from './envelope';
