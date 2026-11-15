import type { AiConfig } from '../../../shared/messages';
import { DEV_GROQ_KEY, DEV_GROQ_MODEL } from './dev-env';

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
/** Same family, smaller: used when the primary model is unavailable or rate limited. */
export const FALLBACK_GROQ_MODEL = 'openai/gpt-oss-20b';

const STORAGE_KEY = 'tederash.aiConfig';

/** What the user saved (persisted). The dev key is never persisted. */
type StoredAiConfig = Pick<
  AiConfig,
  | 'provider'
  | 'apiKey'
  | 'model'
  | 'baseUrl'
  | 'sttProvider'
  | 'sttApiKey'
  | 'sttModel'
  | 'speechLanguage'
  | 'voiceMode'
  | 'speechPauseMs'
>;

let stored: StoredAiConfig | null = null;
let loading: Promise<void> | null = null;

function storageArea(): chrome.storage.StorageArea | undefined {
  try {
    return typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;
  } catch {
    return undefined;
  }
}

function sanitize(config: Partial<StoredAiConfig>): StoredAiConfig {
  const provider = config.provider ?? 'groq';
  const trim = (v?: string) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    provider,
    apiKey: trim(config.apiKey),
    model: trim(config.model),
    baseUrl: trim(config.baseUrl),
    sttProvider: config.sttProvider,
    sttApiKey: trim(config.sttApiKey),
    sttModel: trim(config.sttModel),
    speechLanguage: trim(config.speechLanguage),
    voiceMode: config.voiceMode,
    speechPauseMs: config.speechPauseMs,
  };
}

/** Effective config used by the agent: saved settings, falling back to the dev key for Groq. */
export function getAiConfig(): AiConfig {
  const base = stored ?? { provider: 'groq' as const };
  const usesDevKey = base.provider === 'groq' && !base.apiKey && Boolean(DEV_GROQ_KEY);
  const apiKey = base.apiKey || (usesDevKey ? DEV_GROQ_KEY : undefined);
  const model =
    base.model || (base.provider === 'groq' ? DEV_GROQ_MODEL || DEFAULT_GROQ_MODEL : undefined);
  return {
    provider: base.provider,
    apiKey,
    model,
    baseUrl: base.baseUrl,
    sttProvider: base.sttProvider,
    sttApiKey: base.sttApiKey,
    sttModel: base.sttModel,
    speechLanguage: base.speechLanguage,
    voiceMode: base.voiceMode,
    speechPauseMs: base.speechPauseMs,
    hasApiKey: Boolean(apiKey),
    hasSttApiKey: Boolean(base.sttApiKey),
    apiKeySource: base.apiKey ? 'saved' : usesDevKey ? 'dev' : 'none',
  };
}

/** Config safe to send to UI pages: never includes either key itself. */
export function getPublicAiConfig(): AiConfig {
  const { apiKey: _omitChat, sttApiKey: _omitStt, ...rest } = getAiConfig();
  return rest;
}

/** Loads the saved config once per service-worker lifetime. Safe to call repeatedly. */
export function loadAiConfig(): Promise<AiConfig> {
  if (!loading) {
    loading = (async () => {
      const area = storageArea();
      if (!area) return;
      try {
        const res = await area.get(STORAGE_KEY);
        const raw = res?.[STORAGE_KEY];
        if (raw && typeof raw === 'object') stored = sanitize(raw as Partial<StoredAiConfig>);
      } catch {
        // Storage unavailable: keep defaults.
      }
    })();
  }
  return loading.then(getAiConfig);
}

/**
 * Saves settings from the UI. An omitted/empty apiKey keeps the previously saved key
 * (the settings form never receives the key back, so it cannot resend it).
 */
export async function setAiConfig(config: Partial<StoredAiConfig>): Promise<AiConfig> {
  await loadAiConfig();
  const next = sanitize(config);
  if (!next.apiKey && stored?.apiKey && stored.provider === next.provider) {
    next.apiKey = stored.apiKey;
  }
  // The settings form never receives either key back, so an empty field means "keep".
  if (!next.sttApiKey && stored?.sttApiKey) {
    next.sttApiKey = stored.sttApiKey;
  }
  stored = next;
  try {
    await storageArea()?.set({ [STORAGE_KEY]: next });
  } catch {
    // Keep the in-memory value even if persistence fails.
  }
  return getAiConfig();
}

export function isLlmConfigured(config: AiConfig): boolean {
  if (config.provider === 'heuristic') return false;
  return Boolean(config.apiKey) || config.provider === 'custom';
}

/** Test helper: forget cached state so the next load re-reads storage. */
export function resetAiConfigCache(): void {
  stored = null;
  loading = null;
}
