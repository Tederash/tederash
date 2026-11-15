import { useCallback, useRef, useState } from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import { createSpeechRecognitionController } from '@tederash/core';
import { createEnvelope } from '../../shared/envelope';
import type { PageState, ToolResult } from '../../shared/tools';
import { guidedLangFor, runGuidedFill, type GuidedUiState } from './guidedFill';
import { queryMicrophonePermission, requestMicrophoneAccess, toBase64 } from './useVoice';
import { DEFAULT_PAUSE_MS, encodeWavBlob } from './useVoiceMode';

/** How long the mic stays open waiting for the user to start talking. */
const NO_SPEECH_TIMEOUT_MS = 12_000;
/** Hard cap on one answer. */
const MAX_ANSWER_MS = 30_000;

export interface UseGuidedFillOptions {
  /**
   * 'voice': questions are spoken and answers are heard (Voice tab).
   * 'text': questions are posted in the chat and answers are typed (Text tab).
   */
  mode: 'voice' | 'text';
  /** Text mode: post an assistant message in the conversation. */
  onSay?: (text: string) => void;
  tabId?: number;
  language?: string;
  /** A speech key is configured: transcribe in the worker (better for Amharic). */
  canUpload: boolean;
  /** Called with live words while the user speaks (local engine). */
  onInterim?: (text: string) => void;
}

function send<T>(msg: unknown): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

/**
 * Runs the guided spoken form conversation from the side panel: speak (and wait
 * for the speech to end), open the mic for exactly one answer, close it, repeat.
 */
export function useGuidedFill({ mode, onSay, tabId, language, canUpload, onInterim }: UseGuidedFillOptions) {
  const [ui, setUi] = useState<GuidedUiState | null>(null);
  const [error, setError] = useState<string | undefined>();
  const stopRef = useRef(false);
  const cancelListenRef = useRef<(() => void) | null>(null);
  const runningRef = useRef(false);
  /** Resolves the open listen with a typed or button reply (works without speech). */
  const manualRef = useRef<((text: string) => void) | null>(null);
  /** Answers that arrived before the next question was ready (typed quickly): used in order. */
  const queuedRef = useRef<string[]>([]);

  const opts = useRef({ mode, onSay, tabId, language, canUpload, onInterim });
  opts.current = { mode, onSay, tabId, language, canUpload, onInterim };

  const speak = useCallback(async (text: string) => {
    if (stopRef.current) return;
    if (opts.current.mode === 'text') {
      opts.current.onSay?.(text);
      return;
    }
    try {
      await send(createEnvelope('tts/speak', { text: text.slice(0, 5000), lang: opts.current.language, wait: true }));
    } catch {
      // No speech engine: the text is on screen, carry on.
    }
  }, []);

  /** One utterance with the local recogniser; it ends by itself on silence. */
  const listenLocal = useCallback(
    () =>
      new Promise<string | undefined>((resolve) => {
        let text = '';
        let settled = false;
        const finish = (value?: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cancelListenRef.current = null;
          opts.current.onInterim?.('');
          resolve(value?.trim() || undefined);
        };
        const controller = createSpeechRecognitionController({
          onResult: (r) => {
            if (r.isFinal) text = `${text} ${r.transcript}`.trim();
            else opts.current.onInterim?.(r.transcript);
          },
          onError: () => finish(text),
          onEnd: () => finish(text),
        });
        const timer = setTimeout(() => controller.stop(), MAX_ANSWER_MS);
        cancelListenRef.current = () => {
          controller.abort();
          finish(undefined);
        };
        controller.start({ lang: opts.current.language, continuous: false, interimResults: true });
      }),
    []
  );

  /** One utterance with the VAD, then transcription in the worker. */
  const listenUpload = useCallback(async (): Promise<string | undefined> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const base = `${chrome.runtime.getURL('vad/').replace(/\/+$/, '')}/`;
    let vad: MicVAD | undefined;
    const release = () => {
      try {
        vad?.destroy();
      } catch {
        // Already gone.
      }
      stream.getTracks().forEach((t) => t.stop());
    };
    const audio = await new Promise<Float32Array | undefined>((resolve) => {
      let started = false;
      let settled = false;
      const finish = (value?: Float32Array) => {
        if (settled) return;
        settled = true;
        clearTimeout(noSpeech);
        clearTimeout(cap);
        cancelListenRef.current = null;
        resolve(value);
      };
      const noSpeech = setTimeout(() => {
        if (!started) finish(undefined);
      }, NO_SPEECH_TIMEOUT_MS);
      const cap = setTimeout(() => finish(undefined), MAX_ANSWER_MS);
      cancelListenRef.current = () => finish(undefined);
      void MicVAD.new({
        getStream: async () => stream,
        pauseStream: async () => undefined,
        resumeStream: async (s) => s,
        startOnLoad: false,
        model: 'v5',
        baseAssetPath: base,
        onnxWASMBasePath: base,
        positiveSpeechThreshold: 0.4,
        negativeSpeechThreshold: 0.3,
        // Low on purpose: answers here are often one syllable ("yes", "no", "አዎ"),
        // which a longer minimum discards as a misfire.
        minSpeechMs: 100,
        redemptionMs: DEFAULT_PAUSE_MS,
        preSpeechPadMs: 400,
        onSpeechStart: () => {
          started = true;
        },
        onSpeechEnd: (samples) => finish(samples),
        onVADMisfire: () => {
          started = false;
        },
      })
        .then(async (v) => {
          vad = v;
          if (settled) return;
          await v.start();
        })
        .catch(() => finish(undefined));
    });
    release();
    if (!audio) return undefined;
    const blob = encodeWavBlob(audio);
    if (!blob) return undefined;
    const res = await send<{ ok?: boolean; text?: string }>(
      createEnvelope('speech/transcribe', {
        audioBase64: toBase64(await blob.arrayBuffer()),
        mimeType: 'audio/wav',
        language: opts.current.language,
      })
    ).catch(() => undefined);
    return res?.ok ? res.text?.trim() || undefined : undefined;
  }, []);

  const listen = useCallback(async () => {
    if (stopRef.current) return 'stop';
    // `manual` carries typed answers (text mode) and Stop.
    const manual = new Promise<string>((resolve) => {
      manualRef.current = resolve;
    });
    if (opts.current.mode === 'text') {
      const early = queuedRef.current.shift();
      if (early !== undefined) {
        manualRef.current = null;
        return early;
      }
      const typed = await manual;
      manualRef.current = null;
      return typed;
    }
    const engine = (opts.current.canUpload ? listenUpload() : listenLocal()).catch(() => undefined);
    const result = await Promise.race([engine, manual]);
    manualRef.current = null;
    return result;
  }, [listenLocal, listenUpload]);

  /** Text mode: answer the current question with what the user typed. */
  const answer = useCallback((text: string) => {
    const resolve = manualRef.current;
    if (!resolve) {
      // Not listening yet (still writing the last field): keep it for the next question.
      if (opts.current.mode === 'text' && runningRef.current) queuedRef.current.push(text);
      return;
    }
    manualRef.current = null;
    cancelListenRef.current?.();
    resolve(text);
  }, []);

  const exec = useCallback(
    async (tool: string, args: Record<string, unknown>, confirmed?: boolean): Promise<ToolResult> => {
      const id = opts.current.tabId;
      if (id === undefined) return { ok: false, error: { code: 'NO_TAB', message: 'No page is open.' } };
      try {
        return await send<ToolResult>(createEnvelope('agent/exec', { tabId: id, tool, args, userConfirmed: confirmed }));
      } catch {
        return { ok: false, error: { code: 'TAB_UNREACHABLE', message: 'The page did not answer.' } };
      }
    },
    []
  );

  const start = useCallback(async () => {
    if (runningRef.current) return;
    setError(undefined);
    const permission = opts.current.mode === 'voice' ? await queryMicrophonePermission() : 'granted';
    if (permission !== 'granted') {
      const granted = await requestMicrophoneAccess();
      if (!granted && permission === 'denied') {
        setError('Microphone access is blocked. Allow it for Tederash in chrome://settings/content/microphone.');
        return;
      }
    }
    runningRef.current = true;
    stopRef.current = false;
    queuedRef.current = [];
    try {
      await runGuidedFill({
        lang: guidedLangFor(opts.current.language),
        speak,
        listen,
        exec: (tool, args, confirmed) => exec(tool, args, confirmed),
        getPageState: async () => {
          const res = await exec('page_state', {});
          return res.ok ? (res.data as PageState) : undefined;
        },
        onState: setUi,
        shouldStop: () => stopRef.current,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guided filling stopped unexpectedly.');
    } finally {
      runningRef.current = false;
      cancelListenRef.current = null;
      setUi((s) => (s ? { ...s, phase: s.phase === 'stopped' ? 'stopped' : 'done' } : s));
    }
  }, [exec, listen, speak]);

  const stop = useCallback(() => {
    stopRef.current = true;
    cancelListenRef.current?.();
    manualRef.current?.('stop');
    void send(createEnvelope('tts/stop', {})).catch(() => undefined);
  }, []);

  const dismiss = useCallback(() => {
    if (runningRef.current) stop();
    setUi(null);
  }, [stop]);

    const running = ui !== null && ui.phase !== 'done' && ui.phase !== 'stopped';
  const isRunning = useCallback(() => runningRef.current, []);
  return { ui, error, start, stop, dismiss, answer, running, isRunning };
}
