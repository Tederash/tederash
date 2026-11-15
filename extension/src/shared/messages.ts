import { z } from 'zod';
import {
  EffectiveSettingsSchema,
  ExperienceIdSchema,
  ProfileSchema,
  SettingsPatchSchema,
} from './settings/schema';
import { ToolCallSchema } from './tools';

export const MessageVersionSchema = z.literal(1);

export interface ToolCallItem {
  id: string;
  step?: number;
  tool: string;
  arguments: Record<string, any>;
  rationale: string;
  status?: 'PENDING' | 'SUCCESS' | 'ERROR';
  summary?: string;
  timestamp: number;
}

export type AgentStreamEvent =
  | { type: 'start'; conversationId: string }
  | { type: 'thought'; rationale: string; activeVerb: string }
  | { type: 'tool_call'; toolCall: ToolCallItem }
  | { type: 'tool_result'; id: string; tool: string; status: 'SUCCESS' | 'ERROR'; summary: string }
  | { type: 'token'; token: string }
  | { type: 'done'; conversationId: string; messages: ChatMessage[]; status: 'idle' | 'running' | 'done' | 'error' | 'stopped' }
  | { type: 'error'; error: string }
  | {
      type: 'confirm_request';
      id: string;
      title: string;
      detail: string;
      risk: 'consequential' | 'destructive';
    }
  /** The assistant asked something and is waiting for a spoken answer. */
  | {
      type: 'listen_request';
      id: string;
      prompt: string;
      language?: string;
      /** False when no speech key is set, so the panel transcribes locally instead. */
      canUploadAudio: boolean;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'step';
  content: string;
  timestamp: number;
  toolCall?: { name: string; args: Record<string, unknown> };
  toolResult?: { ok: boolean; data?: unknown; error?: { message: string } };
  status?: 'pending' | 'running' | 'success' | 'error';
  toolCalls?: ToolCallItem[];
  activeVerb?: string;
}

export interface AgentChatResponse {
  ok: boolean;
  conversationId: string;
  messages: ChatMessage[];
  status: 'idle' | 'running' | 'done' | 'error' | 'stopped';
  error?: string;
}

export interface AiConfig {
  provider: 'groq' | 'heuristic' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /** Which speech-to-text service to use; inferred from the available keys when unset. */
  sttProvider?: 'elevenlabs' | 'groq';
  /** Key for a dedicated speech service (ElevenLabs). Never sent to UI pages. */
  sttApiKey?: string;
  /** Speech-to-text model override; each provider has a sensible default. */
  sttModel?: string;
  /** BCP-47 tag used for dictation and spoken replies; defaults to the browser language. */
  speechLanguage?: string;
  /** Set by the background when reporting config to UI pages. */
  hasSttApiKey?: boolean;
  /** Hands-free voice mode is on: the assistant listens and answers aloud. */
  voiceMode?: boolean;
  /** Silence in ms that ends a spoken turn. Longer is kinder to slower speech. */
  speechPauseMs?: number;
  /** Set by the background when reporting config to UI pages (the key itself is never sent). */
  hasApiKey?: boolean;
  apiKeySource?: 'saved' | 'dev' | 'none';
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
export const TabCheckTederashSchema = makeEnvelopeSchema(
  'tab/checkTederash',
  z.object({ tabId: z.number().int().nonnegative().optional() })
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
  z.object({
    text: z.string().min(1).max(5000),
    lang: z.string().max(16).optional(),
    /** Resolve only once speech has finished, so the caller can open the mic without hearing it. */
    wait: z.boolean().optional(),
  })
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
    /** Reply only after the utterance has finished (so a mic can open safely). */
    wait: z.boolean().optional(),
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

/**
 * Runs one page tool through the agent executor (policy, confirmation, sensitive-field
 * refusal all apply). Used by the panel's guided spoken form filling, which is a fixed
 * script rather than a model loop. `userConfirmed` is set only after the user said
 * yes to the exact action out loud or with a button; without it, gated actions decline.
 */
export const AgentExecSchema = makeEnvelopeSchema(
  'agent/exec',
  z.object({
    tabId: z.number().int().nonnegative(),
    tool: z.enum(['page_state', 'fill', 'choose', 'set_checked', 'click', 'describe_target']),
    args: z.record(z.string(), z.unknown()).default({}),
    userConfirmed: z.boolean().optional(),
  })
);

export const AiGetConfigSchema = makeEnvelopeSchema('ai/getConfig', z.object({}));

export const AiSetConfigSchema = makeEnvelopeSchema(
  'ai/setConfig',
  z.object({
    provider: z.enum(['groq', 'heuristic', 'gemini', 'openai', 'anthropic', 'custom']),
    apiKey: z.string().max(300).optional(),
    model: z.string().max(100).optional(),
    baseUrl: z.string().max(300).optional(),
    sttProvider: z.enum(['elevenlabs', 'groq']).optional(),
    sttApiKey: z.string().max(300).optional(),
    sttModel: z.string().max(100).optional(),
    speechLanguage: z.string().max(20).optional(),
    voiceMode: z.boolean().optional(),
    speechPauseMs: z.number().int().min(400).max(5000).optional(),
  })
);

/** Dictation from a UI page: base64 audio in, text out. ~24MB of audio is ~32MB base64. */
export const SpeechTranscribeSchema = makeEnvelopeSchema(
  'speech/transcribe',
  z.object({
    audioBase64: z.string().min(1).max(34_000_000),
    mimeType: z.string().max(100).optional(),
    language: z.string().max(20).optional(),
  })
);

export interface SpeechTranscribeResponse {
  ok: boolean;
  text?: string;
  error?: string;
}

export const UiToBgSchema = z.discriminatedUnion('type', [
  SystemPingSchema,
  TabPingContentSchema,
  TabCheckTederashSchema,
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
  AgentExecSchema,
  AiGetConfigSchema,
  AiSetConfigSchema,
  SpeechTranscribeSchema,
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
  isTederash?: boolean;
  tederashVersion?: string;
  tederashProfile?: string;
  tederashLocale?: string;
}

export interface TabCheckTederashResponse {
  ok: boolean;
  isTederash: boolean;
  tederashVersion?: string;
  tederashProfile?: string;
  tederashLocale?: string;
  url?: string;
  tabId?: number;
  error?: string;
}

export { createEnvelope } from './envelope';
