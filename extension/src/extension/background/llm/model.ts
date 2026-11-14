import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { AiConfig } from '../../../shared/messages';
import { DEFAULT_GROQ_MODEL } from './index';

const BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  openai: 'https://api.openai.com/v1',
};

const DEFAULT_MODELS: Record<string, string> = {
  groq: DEFAULT_GROQ_MODEL,
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o-mini',
};

export function resolveModelId(config: AiConfig, override?: string): string {
  return override || config.model || DEFAULT_MODELS[config.provider] || DEFAULT_GROQ_MODEL;
}

/** Longest provider-requested wait we absorb silently before surfacing the rate limit. */
export const MAX_RATE_LIMIT_WAIT_MS = 10_000;
const MAX_RATE_LIMIT_RETRIES = 2;

/** Seconds to wait from a 429: `retry-after` header, else Groq's "try again in 1.2s". */
export function parseRetryAfterMs(headers: Headers, body: string): number | undefined {
  const header = Number.parseFloat(headers.get('retry-after') ?? '');
  if (Number.isFinite(header)) return Math.ceil(header * 1000);
  const match = body.match(/try again in ([\d.]+)(ms|s)/i);
  const [, amount, unit] = match ?? [];
  if (!amount || !unit) return undefined;
  const n = Number.parseFloat(amount);
  return Math.ceil(unit.toLowerCase() === 'ms' ? n : n * 1000);
}

const sleep = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/**
 * fetch that waits out short rate limits (per-minute token caps on free tiers are
 * hit routinely by multi-step turns). Longer waits are returned as the 429 itself.
 */
export function createRateLimitAwareFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const res = await baseFetch(input, init);
      if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return res;
      const waitMs = parseRetryAfterMs(res.headers, await res.clone().text());
      if (waitMs === undefined || waitMs > MAX_RATE_LIMIT_WAIT_MS) return res;
      await sleep(waitMs + 250, init?.signal);
    }
  };
}

/**
 * Chat Completions model for any OpenAI-compatible provider. `.chat()` is deliberate:
 * Groq and Gemini do not implement OpenAI's `/v1/responses` API.
 */
export function createChatModel(config: AiConfig, modelOverride?: string): LanguageModel {
  const client = createOpenAI({
    baseURL: config.baseUrl || BASE_URLS[config.provider] || BASE_URLS.groq,
    apiKey: config.apiKey ?? '',
    fetch: createRateLimitAwareFetch(),
  });
  return client.chat(resolveModelId(config, modelOverride));
}
