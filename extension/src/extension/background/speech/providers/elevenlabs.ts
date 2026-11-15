import { baseLanguage } from '../language';
import { type ProviderResult, type ProviderTranscribe, describeHttpFailure } from './types';

/**
 * ElevenLabs Scribe. The accuracy tier, and the only option that makes Amharic work
 * at all: 3.1% WER on FLEURS Amharic against Whisper large-v3's 99.8%. Needs its own
 * key (`xi-api-key`), separate from the chat model's.
 */
export const ELEVENLABS_STT_MODEL = 'scribe_v2';

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export const transcribeWithElevenLabs: ProviderTranscribe = async (req) => {
  const form = new FormData();
  form.append('file', req.audio, 'speech.wav');
  form.append('model_id', req.model || ELEVENLABS_STT_MODEL);
  form.append('language_code', baseLanguage(req.language));

  const res = await (req.fetchImpl ?? fetch)(req.baseUrl || ELEVENLABS_URL, {
    method: 'POST',
    headers: { 'xi-api-key': req.apiKey },
    body: form,
    signal: req.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      detail: describeHttpFailure('ElevenLabs', res.status, detail),
    };
  }

  const body = (await res.json()) as {
    text?: unknown;
    language_code?: unknown;
    language_probability?: unknown;
  };

  return {
    ok: true,
    text: typeof body.text === 'string' ? body.text.trim() : '',
    confidence:
      typeof body.language_probability === 'number' ? body.language_probability : undefined,
    detectedLanguage: typeof body.language_code === 'string' ? body.language_code : undefined,
  } satisfies ProviderResult;
};
