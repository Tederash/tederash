import type { AiConfig } from '../../../shared/messages';
import { baseLanguage, looksLikeWrongScript, resolveSpeechLanguage, whisperSupportsLanguage } from './language';
import { ELEVENLABS_STT_MODEL, transcribeWithElevenLabs } from './providers/elevenlabs';
import { GROQ_STT_MODEL, transcribeWithGroq } from './providers/groq';
import type { SttProviderId } from './providers/types';

/**
 * Speech to text.
 *
 * Two hosted tiers, because no single engine covers both English and Amharic:
 * ElevenLabs Scribe for accuracy (and the only one that can do Ethiopic scripts at
 * all), Groq Whisper as the free English option on the key the chat model already
 * uses. With no key, the side panel recognises locally with the Web Speech API and
 * sends text instead, so no audio leaves the device in that tier.
 *
 * Every request carries a language hint, and a transcript written in the wrong
 * script for that language is refused — see ./language.ts.
 */

/** Groq rejects audio over 25MB on the free tier; stop before paying the upload cost. */
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

/** Below this, a provider's own language confidence is not worth acting on. */
export const MIN_CONFIDENCE = 0.5;

export type TranscriptionFailureCode =
  | 'NO_KEY'
  | 'TOO_LARGE'
  | 'EMPTY'
  | 'LOW_CONFIDENCE'
  | 'LANGUAGE_UNSUPPORTED'
  | 'PROVIDER';

export type TranscriptionResult =
  | {
      ok: true;
      text: string;
      source: SttProviderId;
      language: string;
      confidence?: number;
    }
  | { ok: false; error: string; code: TranscriptionFailureCode };

export interface TranscribeOptions {
  audio: Blob;
  config: AiConfig;
  /** Overrides the saved language for this request. */
  language?: string;
  model?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/** Scribe when it has its own key, otherwise the chat provider's Groq key. */
export function resolveSttProvider(config: AiConfig): { id: SttProviderId; apiKey?: string } | undefined {
  if (config.sttProvider === 'elevenlabs' || (!config.sttProvider && config.sttApiKey)) {
    return { id: 'elevenlabs', apiKey: config.sttApiKey };
  }
  if (config.sttProvider === 'groq') return { id: 'groq', apiKey: config.apiKey };
  if (config.sttApiKey) return { id: 'elevenlabs', apiKey: config.sttApiKey };
  if (config.apiKey) return { id: 'groq', apiKey: config.apiKey };
  return undefined;
}

export function defaultModelFor(provider: SttProviderId): string {
  return provider === 'elevenlabs' ? ELEVENLABS_STT_MODEL : GROQ_STT_MODEL;
}

export async function transcribeAudio(opts: TranscribeOptions): Promise<TranscriptionResult> {
  const language = resolveSpeechLanguage(opts.language, opts.config.speechLanguage);
  const provider = resolveSttProvider(opts.config);

  if (!provider?.apiKey) {
    return { ok: false, code: 'NO_KEY', error: 'No speech-to-text key is configured.' };
  }

  // Refusing is kinder than returning nonsense that would be typed into a page.
  if (provider.id === 'groq' && !whisperSupportsLanguage(language)) {
    return {
      ok: false,
      code: 'LANGUAGE_UNSUPPORTED',
      error: `Whisper cannot transcribe ${baseLanguage(language)} usably, so I will not guess at it. Add an ElevenLabs key in Settings to use voice in this language.`,
    };
  }

  if (opts.audio.size === 0) {
    return { ok: false, code: 'EMPTY', error: 'No audio was recorded.' };
  }
  if (opts.audio.size > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      error: 'That recording is too long to transcribe. Try again with a shorter answer.',
    };
  }

  const transcribe = provider.id === 'elevenlabs' ? transcribeWithElevenLabs : transcribeWithGroq;

  let result;
  try {
    result = await transcribe({
      audio: opts.audio,
      apiKey: provider.apiKey,
      language,
      model: opts.model || opts.config.sttModel,
      baseUrl: provider.id === 'groq' ? opts.config.baseUrl : undefined,
      signal: opts.signal,
      fetchImpl: opts.fetchImpl,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, code: 'PROVIDER', error: 'Listening was cancelled.' };
    }
    return {
      ok: false,
      code: 'PROVIDER',
      error: 'Could not reach the speech service. Check your connection and try again.',
    };
  }

  if (!result.ok) {
    return { ok: false, code: 'PROVIDER', error: result.detail ?? 'That could not be transcribed.' };
  }
  if (!result.text) {
    return { ok: false, code: 'EMPTY', error: 'Nothing was heard in that recording.' };
  }

  if (typeof result.confidence === 'number' && result.confidence < MIN_CONFIDENCE) {
    return {
      ok: false,
      code: 'LOW_CONFIDENCE',
      error: 'I could not make that out clearly. Please say it again.',
    };
  }

  // The failure mode that produced Cyrillic text from English speech.
  if (looksLikeWrongScript(result.text, language)) {
    return {
      ok: false,
      code: 'LOW_CONFIDENCE',
      error: 'That did not come back in the language I expected, so I ignored it. Please say it again.',
    };
  }

  return {
    ok: true,
    text: result.text,
    source: provider.id,
    language,
    confidence: result.confidence,
  };
}
