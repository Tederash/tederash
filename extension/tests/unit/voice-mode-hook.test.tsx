import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Drives useVoiceMode with a mocked VAD, end to end: speech starts, speech ends,
 * the worker transcribes, the transcript reaches the panel. The machine-only tests
 * dispatch `speechEnd` themselves, which is why they missed the hook never doing it
 * (the panel sat on "Hearing you…" and the transcript was dropped).
 */

const vadHandlers: { onSpeechStart?: () => void; onSpeechEnd?: (a: Float32Array) => void } = {};
vi.mock('@ricky0123/vad-web', () => ({
  MicVAD: {
    new: vi.fn(async (opts: typeof vadHandlers) => {
      vadHandlers.onSpeechStart = opts.onSpeechStart;
      vadHandlers.onSpeechEnd = opts.onSpeechEnd;
      return { start: vi.fn(async () => undefined), destroy: vi.fn() };
    }),
  },
}));

import { useVoiceMode, type UseVoiceModeOptions } from '../../src/components/sidepanel/useVoiceMode';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Minimal renderHook on the extension's own React 18. */
function renderVoiceMode(opts: UseVoiceModeOptions) {
  const result = { current: undefined as unknown as ReturnType<typeof useVoiceMode> };
  function Probe() {
    result.current = useVoiceMode(opts);
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(React.createElement(Probe)));
  return { result };
}

async function waitFor(check: () => void, timeout = 2000) {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (e) {
      if (Date.now() - start > timeout) throw e;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }
  }
}

beforeEach(() => {
  (globalThis as any).chrome = {
    runtime: {
      getURL: (p: string) => `chrome-extension://x/${p}`,
      sendMessage: vi.fn(async (msg: any) =>
        msg.type === 'speech/transcribe' ? { ok: true, text: 'fill my name' } : { ok: true }
      ),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    tabs: { create: vi.fn() },
  };
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => ({ state: 'granted' })) },
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
  });
});

describe('useVoiceMode with the VAD engine', () => {
  it('delivers the transcript after speech ends instead of hanging on "Hearing you…"', async () => {
    const onTranscript = vi.fn();
    const { result } = renderVoiceMode({ canUpload: true, language: 'en-US', onTranscript });
    act(() => result.current.toggle(true));
    await waitFor(() => expect(result.current.status).toBe('listening'));

    act(() => vadHandlers.onSpeechStart?.());
    expect(result.current.status).toBe('capturing');

    act(() => vadHandlers.onSpeechEnd?.(new Float32Array(1600).fill(0.1)));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('fill my name', expect.any(Object)));
    expect(result.current.status).toBe('busy');

    act(() => result.current.notifyTurnEnded());
    expect(result.current.status).toBe('listening');
  });
});
