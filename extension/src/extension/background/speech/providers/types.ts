export type SttProviderId = 'elevenlabs' | 'groq';

export interface ProviderRequest {
  audio: Blob;
  apiKey: string;
  /** Always set: see speech/language.ts for why a hint is never omitted. */
  language: string;
  model?: string;
  baseUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export type ProviderResult =
  | {
      ok: true;
      text: string;
      /** Provider's own confidence, where it reports one (0–1). */
      confidence?: number;
      detectedLanguage?: string;
    }
  | { ok: false; status?: number; detail?: string };

export type ProviderTranscribe = (req: ProviderRequest) => Promise<ProviderResult>;

/** Shared failure wording, so every provider explains itself the same way. */
export function describeHttpFailure(provider: string, status: number, detail: string): string {
  if (status === 401 || status === 403) {
    return `${provider} rejected the API key. Check it in Settings.`;
  }
  if (status === 429) {
    return `${provider} is rate limited right now. Try again in a moment.`;
  }
  if (status === 413) {
    return 'That recording is too long to transcribe. Try again with a shorter answer.';
  }
  const trimmed = detail.slice(0, 200);
  return `${provider} could not transcribe that${trimmed ? `: ${trimmed}` : '.'}`;
}
