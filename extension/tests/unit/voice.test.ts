import { describe, expect, it, vi } from 'vitest';
import { requestMicrophoneAccess } from '../../src/components/sidepanel/useVoice';
import {
  MAX_AUDIO_BYTES,
  resolveSttProvider,
  transcribeAudio,
} from '../../src/extension/background/speech/transcribe';
import {
  baseLanguage,
  looksLikeWrongScript,
  resolveSpeechLanguage,
  whisperSupportsLanguage,
} from '../../src/extension/background/speech/language';
import { GROQ_STT_MODEL } from '../../src/extension/background/speech/providers/groq';
import { ELEVENLABS_STT_MODEL } from '../../src/extension/background/speech/providers/elevenlabs';
import { encodeWav } from '../../src/extension/background/speech/wav';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('microphone permission', () => {
  function installChrome() {
    const listeners: Array<(msg: unknown) => void> = [];
    const create = vi.fn(async () => ({ id: 9 }));
    (globalThis as any).chrome = {
      tabs: { create },
      runtime: {
        getURL: (path: string) => `chrome-extension://abc/${path}`,
        onMessage: {
          addListener: (fn: (msg: unknown) => void) => listeners.push(fn),
          removeListener: (fn: (msg: unknown) => void) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          },
        },
      },
    };
    return { create, send: (msg: unknown) => listeners.forEach((fn) => fn(msg)), listeners };
  }

  it('asks on a tab, because a side panel cannot raise Chrome’s prompt', async () => {
    const chromeMock = installChrome();
    const pending = requestMicrophoneAccess();

    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'chrome-extension://abc/microphone.html',
    });

    chromeMock.send({ type: 'mic/permissionResult', granted: true });
    await expect(pending).resolves.toBe(true);
    // The listener is removed once answered, so a later message cannot resolve it twice.
    expect(chromeMock.listeners).toHaveLength(0);
  });

  it('resolves false when the user blocks it', async () => {
    const chromeMock = installChrome();
    const pending = requestMicrophoneAccess();
    chromeMock.send({ type: 'mic/permissionResult', granted: false });
    await expect(pending).resolves.toBe(false);
  });

  it('ignores unrelated runtime messages while waiting', async () => {
    const chromeMock = installChrome();
    const pending = requestMicrophoneAccess();
    chromeMock.send({ type: 'panel/startListening' });
    expect(chromeMock.listeners).toHaveLength(1);
    chromeMock.send({ type: 'mic/permissionResult', granted: true });
    await expect(pending).resolves.toBe(true);
  });

  it('gives up rather than waiting forever if the tab is just closed', async () => {
    installChrome();
    vi.useFakeTimers();
    const pending = requestMicrophoneAccess();
    vi.advanceTimersByTime(90_001);
    await expect(pending).resolves.toBe(false);
    vi.useRealTimers();
  });

  it('reports false where there is no tabs API to ask with', async () => {
    (globalThis as any).chrome = {};
    await expect(requestMicrophoneAccess()).resolves.toBe(false);
  });
});

describe('speech language', () => {
  it('always resolves to something, never empty', () => {
    expect(resolveSpeechLanguage(undefined, undefined)).toMatch(/\S/);
    expect(resolveSpeechLanguage('', '  ', 'am-ET')).toBe('am-ET');
    expect(resolveSpeechLanguage('en-GB', 'am-ET')).toBe('en-GB');
  });

  it('reduces a tag to its base language', () => {
    expect(baseLanguage('am-ET')).toBe('am');
    expect(baseLanguage('en_US')).toBe('en');
    expect(baseLanguage('OM')).toBe('om');
  });

  it('knows Whisper cannot do Ethiopic languages', () => {
    expect(whisperSupportsLanguage('am-ET')).toBe(false);
    expect(whisperSupportsLanguage('ti')).toBe(false);
    expect(whisperSupportsLanguage('om-ET')).toBe(false);
    expect(whisperSupportsLanguage('en-US')).toBe(true);
    expect(whisperSupportsLanguage('fr')).toBe(true);
  });

  it('catches the reported failure: Cyrillic back from an English request', () => {
    expect(looksLikeWrongScript('Радис да контент от диспетч', 'en-US')).toBe(true);
  });

  it('catches Latin back from an Amharic request, and the reverse', () => {
    expect(looksLikeWrongScript('fill in the form please', 'am-ET')).toBe(true);
    expect(looksLikeWrongScript('ቅጹን ሙላልኝ', 'en-US')).toBe(true);
  });

  it('accepts a transcript in the right script', () => {
    expect(looksLikeWrongScript('fill in the form please', 'en-US')).toBe(false);
    expect(looksLikeWrongScript('ቅጹን ሙላልኝ', 'am-ET')).toBe(false);
    expect(looksLikeWrongScript('Galmee kana guuti', 'om-ET')).toBe(false);
  });

  it('tolerates names and loanwords in another script', () => {
    // Mostly English with one Amharic name is still an English transcript.
    expect(looksLikeWrongScript('put አበበ in the full name field please', 'en-US')).toBe(false);
  });

  it('has no opinion on tiny or unknown-language transcripts', () => {
    expect(looksLikeWrongScript('42', 'en-US')).toBe(false);
    expect(looksLikeWrongScript('ok', 'en-US')).toBe(false);
    expect(looksLikeWrongScript('Радис да контент', 'xx')).toBe(false);
  });
});

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM header and the samples', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const blob = encodeWav(samples, 16_000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);
  });

  it('round-trips sample values within 16-bit precision', async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0.999, -0.999]);
    const buffer = await encodeWav(samples).arrayBuffer();
    const view = new DataView(buffer);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
    for (let i = 0; i < samples.length; i++) {
      const decoded = view.getInt16(44 + i * 2, true) / (samples[i]! < 0 ? 0x8000 : 0x7fff);
      expect(Math.abs(decoded - samples[i]!)).toBeLessThan(1e-3);
    }
  });

  it('clamps out-of-range samples instead of wrapping', async () => {
    const buffer = await encodeWav(new Float32Array([3, -3])).arrayBuffer();
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe('resolveSttProvider', () => {
  it('prefers Scribe when it has a key, since it is the accurate one', () => {
    expect(resolveSttProvider({ provider: 'groq', apiKey: 'gsk', sttApiKey: 'xi' })).toEqual({
      id: 'elevenlabs',
      apiKey: 'xi',
    });
  });

  it('falls back to the Groq key the chat model already has', () => {
    expect(resolveSttProvider({ provider: 'groq', apiKey: 'gsk' })).toEqual({ id: 'groq', apiKey: 'gsk' });
  });

  it('honours an explicit choice', () => {
    expect(resolveSttProvider({ provider: 'groq', apiKey: 'gsk', sttApiKey: 'xi', sttProvider: 'groq' })).toEqual({
      id: 'groq',
      apiKey: 'gsk',
    });
  });

  it('is undefined with no keys at all, so the local tier is used', () => {
    expect(resolveSttProvider({ provider: 'groq' })).toBeUndefined();
  });
});

describe('transcribeAudio', () => {
  const groqConfig = { provider: 'groq' as const, apiKey: 'gsk_test', speechLanguage: 'en-US' };
  const scribeConfig = { provider: 'groq' as const, apiKey: 'gsk_test', sttApiKey: 'xi_test', speechLanguage: 'am-ET' };
  const wav = () => new Blob(['audio'], { type: 'audio/wav' });

  it('always sends a language hint to Whisper, and uses large-v3', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ text: '  fill in the form  ' }));
    const result = await transcribeAudio({ audio: wav(), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result).toMatchObject({ ok: true, text: 'fill in the form', source: 'groq', language: 'en-US' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer gsk_test');
    const form = init!.body as FormData;
    expect(form.get('model')).toBe(GROQ_STT_MODEL);
    expect(GROQ_STT_MODEL).toBe('whisper-large-v3');
    expect(form.get('language')).toBe('en');
  });

  it('sends a hint even when nothing is configured (the bug that produced Cyrillic)', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ text: 'hello' }));
    await transcribeAudio({ audio: wav(), config: { provider: 'groq', apiKey: 'gsk_test' }, fetchImpl: fetchImpl as unknown as typeof fetch });
    const form = fetchImpl.mock.calls[0]![1]!.body as FormData;
    expect(form.get('language')).toMatch(/^[a-z]{2}/);
  });

  it('refuses the English-request/Cyrillic-reply case instead of passing it on', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ text: 'Радис да контент от диспетч' }));
    const result = await transcribeAudio({ audio: wav(), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, code: 'LOW_CONFIDENCE' });
  });

  it('routes Amharic to Scribe with its own key and model', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ text: 'ቅጹን ሙላልኝ', language_code: 'am', language_probability: 0.98 })
    );
    const result = await transcribeAudio({ audio: wav(), config: scribeConfig, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result).toMatchObject({ ok: true, text: 'ቅጹን ሙላልኝ', source: 'elevenlabs', confidence: 0.98 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.elevenlabs.io/v1/speech-to-text');
    expect((init!.headers as Record<string, string>)['xi-api-key']).toBe('xi_test');
    const form = init!.body as FormData;
    expect(form.get('model_id')).toBe(ELEVENLABS_STT_MODEL);
    expect(form.get('language_code')).toBe('am');
  });

  it('refuses Amharic on Whisper rather than returning nonsense', async () => {
    const fetchImpl = vi.fn();
    const result = await transcribeAudio({
      audio: wav(),
      config: { provider: 'groq', apiKey: 'gsk_test', speechLanguage: 'am-ET' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, code: 'LANGUAGE_UNSUPPORTED' });
    expect(result.ok === false && result.error).toMatch(/ElevenLabs/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a low-confidence Scribe result', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ text: 'ቅጹን', language_probability: 0.2 }));
    const result = await transcribeAudio({ audio: wav(), config: scribeConfig, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, code: 'LOW_CONFIDENCE' });
  });

  it('reports a missing key instead of calling out', async () => {
    const fetchImpl = vi.fn();
    const result = await transcribeAudio({ audio: wav(), config: { provider: 'groq' }, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, code: 'NO_KEY' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses an empty or oversized recording before uploading', async () => {
    const fetchImpl = vi.fn();
    expect(await transcribeAudio({ audio: new Blob([]), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch })).toMatchObject({ ok: false, code: 'EMPTY' });
    const huge = { size: MAX_AUDIO_BYTES + 1, type: 'audio/wav' } as Blob;
    expect(await transcribeAudio({ audio: huge, config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch })).toMatchObject({ ok: false, code: 'TOO_LARGE' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('explains a rejected key in words the user can act on', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad key', { status: 401 }));
    const result = await transcribeAudio({ audio: wav(), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, code: 'PROVIDER' });
    expect(result.ok === false && result.error).toMatch(/API key/);
  });

  it('reports an empty transcript rather than pretending it heard something', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ text: '   ' }));
    expect(await transcribeAudio({ audio: wav(), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch })).toMatchObject({ ok: false, code: 'EMPTY' });
  });

  it('survives a network failure with a readable message', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const result = await transcribeAudio({ audio: wav(), config: groqConfig, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, code: 'PROVIDER' });
    expect(result.ok === false && result.error).toMatch(/connection/);
  });
});
