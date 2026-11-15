import { describe, expect, it, vi } from 'vitest';
import { LISTEN_BUDGET, TurnGuards } from '../../src/extension/background/agent/guards';
import { buildSystemPrompt } from '../../src/extension/background/agent/prompt';
import { AGENT_TOOL_DEFS } from '../../src/extension/background/agent/tools';
import {
  awaitVoiceReply,
  parseVoiceReplyMessage,
  resolveVoiceReply,
} from '../../src/extension/background/agent/voice-reply';
import { requestMicrophoneAccess } from '../../src/components/sidepanel/useVoice';
import { evaluatePolicy } from '../../src/extension/background/policy';
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
import { ListenArgsSchema } from '../../src/shared/tools';

const config = { provider: 'groq' as const, apiKey: 'gsk_test' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('listen tool', () => {
  it('is offered to the model as a way to ask and hear back', () => {
    const def = AGENT_TOOL_DEFS.listen;
    expect(def.contentTool).toBe('listen');
    expect(def.kind).toBe('perceive');
    expect(def.description).toMatch(/spoken answer/);
  });

  it('accepts a prompt with an optional language', () => {
    expect(ListenArgsSchema.safeParse({ prompt: 'What is your email?' }).success).toBe(true);
    expect(ListenArgsSchema.safeParse({ prompt: 'ኢሜልዎ ማን ነው?', language: 'am-ET' }).success).toBe(
      true
    );
    expect(ListenArgsSchema.safeParse({ prompt: '' }).success).toBe(false);
  });

  it('never needs confirmation: asking a question changes nothing', () => {
    expect(evaluatePolicy({ name: 'listen', args: { prompt: 'Which one?' } } as never)).toMatchObject(
      { requiresConfirmation: false, allowed: true }
    );
  });

  it('is capped per turn so the user is not interrogated in a loop', () => {
    const guards = new TurnGuards('fill the form');
    for (let i = 0; i < LISTEN_BUDGET; i++) {
      expect(guards.check('listen', { prompt: `q${i}` }, 'perceive').kind).toBe('run');
    }
    const blocked = guards.check('listen', { prompt: 'one more' }, 'perceive');
    expect(blocked.kind).toBe('over_budget');
    expect(blocked.kind === 'over_budget' && blocked.note).toMatch(/one written message/);
  });

  it('does not spend the perception budget on inspecting the page', () => {
    const guards = new TurnGuards('fill the form');
    guards.check('listen', { prompt: 'a' }, 'perceive');
    guards.check('listen', { prompt: 'b' }, 'perceive');
    // Perception is still available: the two listens did not consume it.
    expect(guards.check('inspect_form', {}, 'perceive').kind).toBe('run');
  });
});

describe('voice turn prompt', () => {
  it('asks for spoken replies only when the user spoke', () => {
    const spoken = buildSystemPrompt({ isVoiceTurn: true });
    expect(spoken).toContain('VOICE');
    expect(spoken).toMatch(/call listen/);
    expect(buildSystemPrompt({ isVoiceTurn: false })).not.toContain('VOICE:');
  });

  it('tells the model to collect everything in one spoken question', () => {
    expect(buildSystemPrompt({ isVoiceTurn: true })).toMatch(/Do not call listen once per field/);
  });
});

describe('voice reply round-trip', () => {
  it('resolves the waiting tool with locally recognised text', async () => {
    const pending = awaitVoiceReply('v1');
    expect(resolveVoiceReply('v1', { kind: 'text', text: 'Senior, and remote' })).toBe(true);
    await expect(pending).resolves.toMatchObject({ kind: 'text', text: 'Senior, and remote' });
  });

  it('reports a cancellation when the user backs out', async () => {
    const pending = awaitVoiceReply('v2');
    resolveVoiceReply('v2', { kind: 'cancelled', reason: 'cancelled' });
    await expect(pending).resolves.toMatchObject({ kind: 'cancelled' });
  });

  it('gives up after the timeout instead of hanging the turn', async () => {
    vi.useFakeTimers();
    const pending = awaitVoiceReply('v3', undefined, 1000);
    vi.advanceTimersByTime(1001);
    await expect(pending).resolves.toMatchObject({ kind: 'cancelled', reason: 'timeout' });
    vi.useRealTimers();
  });

  it('ends the wait when the turn is aborted', async () => {
    const controller = new AbortController();
    const pending = awaitVoiceReply('v4', controller.signal);
    controller.abort();
    await expect(pending).resolves.toMatchObject({ kind: 'cancelled', reason: 'stopped' });
  });

  it('ignores an answer for a listen that is no longer pending', () => {
    expect(resolveVoiceReply('nope', { kind: 'text', text: 'hi' })).toBe(false);
  });

  it('decodes base64 audio from the panel (port messages are JSON, not clones)', () => {
    const reply = parseVoiceReplyMessage({
      kind: 'audio',
      audioBase64: btoa('fake-audio'),
      mimeType: 'audio/webm',
      language: 'am-ET',
    });
    expect(reply.kind).toBe('audio');
    if (reply.kind === 'audio') {
      expect(new TextDecoder().decode(reply.audio)).toBe('fake-audio');
      expect(reply.language).toBe('am-ET');
    }
  });

  it('treats a malformed message as a cancellation rather than crashing', () => {
    expect(parseVoiceReplyMessage(null).kind).toBe('cancelled');
    expect(parseVoiceReplyMessage({ kind: 'text', text: '   ' }).kind).toBe('cancelled');
    expect(parseVoiceReplyMessage({ kind: 'audio', audioBase64: '!!!not base64!!!' }).kind).toBe(
      'cancelled'
    );
  });
});

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
