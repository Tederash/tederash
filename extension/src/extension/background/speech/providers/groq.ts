import { createRateLimitAwareFetch } from '../../llm/model';
import { baseLanguage } from '../language';
import { type ProviderResult, type ProviderTranscribe, describeHttpFailure } from './types';

/**
 * Groq's OpenAI-compatible Whisper endpoint. Free tier, and it reuses the key the
 * chat model already has — but see speech/language.ts: Whisper is unusable for
 * Ethiopic languages, so this provider is gated on language before it is called.
 *
 * `large-v3`, not `-turbo`: turbo is faster but noticeably weaker at identifying
 * and transcribing anything that is not clear English.
 */
export const GROQ_STT_MODEL = 'whisper-large-v3';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export const transcribeWithGroq: ProviderTranscribe = async (req) => {
  const form = new FormData();
  form.append('file', req.audio, 'speech.wav');
  form.append('model', req.model || GROQ_STT_MODEL);
  form.append('response_format', 'json');
  form.append('language', baseLanguage(req.language));
  // Deterministic: sampling adds nothing useful to a short command.
  form.append('temperature', '0');

  const doFetch = createRateLimitAwareFetch(req.fetchImpl ?? fetch);
  const url = req.baseUrl ? `${req.baseUrl.replace(/\/+$/, '')}/audio/transcriptions` : GROQ_URL;

  const res = await doFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${req.apiKey}` },
    body: form,
    signal: req.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, status: res.status, detail: describeHttpFailure('Groq', res.status, detail) };
  }

  const body = (await res.json()) as { text?: unknown };
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  return { ok: true, text } satisfies ProviderResult;
};
