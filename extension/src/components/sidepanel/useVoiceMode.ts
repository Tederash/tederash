import { useCallback, useEffect, useReducer, useRef } from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import { createSpeechRecognitionController } from '@tederash/core';
import { createEnvelope } from '../../shared/envelope';
import { initialVoiceModeState, transition, type VoiceModeStatus } from './voiceModeMachine';
import { toBase64, queryMicrophonePermission, requestMicrophoneAccess } from './useVoice';

/**
 * Hands-free voice mode.
 *
 * The microphone stays live for as long as voice mode is on. A local voice
 * activity detector (Silero, via @ricky0123/vad-web) decides when the user has
 * started and finished speaking, so no button press is needed; the assistant
 * answers aloud, and speech during a spoken answer is barge-in.
 *
 * Two engines, mirroring the dictation tiers:
 * - With a speech key, the VAD hands raw samples over; they are encoded as WAV
 *   and transcribed in the service worker (accurate, works for Amharic).
 * - With no key, the Web Speech API recognises locally — nothing leaves the
 *   device. That tier cannot safely hear while the assistant speaks (it would
 *   transcribe its own voice through the speakers), so recognition pauses while
 *   a turn runs instead of bargeing in.
 */

/** Default silence that ends a spoken turn; generous so slow speech is not cut. */
export const DEFAULT_PAUSE_MS = 1400;

export interface VoiceTurnMeta {
  /** True when this utterance answers a question the assistant asked aloud. */
  /** True when this utterance interrupted the assistant mid-answer. */
  isBargeIn: boolean;
}

export interface UseVoiceModeOptions {
  language?: string;
  /** True when a speech key is configured, so audio can be uploaded. */
  canUpload: boolean;
  /** Silence in ms that ends a spoken turn. Longer is kinder to slower speech. */
  pauseMs?: number;
  /** Called with a usable transcript after transcription succeeds. */
  onTranscript: (text: string, meta: VoiceTurnMeta) => void;
  /** Status and error text for the panel to announce and show. */
  onNotice?: (text: string) => void;
  /** Live word-in-progress while the user speaks (local engine only). */
  onInterim?: (text: string) => void;
  /** Panel-maintained refs so callbacks can stay registered once. */
}

export interface UseVoiceModeResult {
  enabled: boolean;
  status: VoiceModeStatus;
  error?: string;
  toggle: (enabled?: boolean) => void;
  /** The panel calls this when an agent turn finishes, to hand the mic back. */
  notifyTurnEnded: () => void;
}

export function useVoiceMode({
  language,
  canUpload,
  pauseMs,
  onTranscript,
  onNotice,
  onInterim,
}: UseVoiceModeOptions): UseVoiceModeResult {
  const [state, dispatch] = useReducer(transition, initialVoiceModeState);

  /** True while this hook is between a capture and its dispatch. */
  const busyCaptureRef = useRef(false);
  const vadRef = useRef<MicVAD | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognitionController> | null>(null);
  const metaRef = useRef<VoiceTurnMeta>({ isBargeIn: false });

  // Kept current so callbacks registered once see fresh options.
  const optionsRef = useRef({ language, canUpload, pauseMs, onTranscript, onNotice, onInterim });
  optionsRef.current = { language, canUpload, pauseMs, onTranscript, onNotice, onInterim };

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Resolves the VAD worklet/model/ORT paths inside the extension origin. */
  const assetPath = useCallback(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return '/';
    return `${chrome.runtime.getURL('vad/').replace(/\/+$/, '')}/`;
  }, []);

  const sendForTranscription = useCallback(
    async (samples: Float32Array): Promise<{ ok: boolean; text?: string }> => {
      const blob = encodeWavBlob(samples);
      if (!blob || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return { ok: false };
      }
      try {
        const res = (await chrome.runtime.sendMessage(
          createEnvelope('speech/transcribe', {
            audioBase64: toBase64(await blob.arrayBuffer()),
            mimeType: 'audio/wav',
            language: optionsRef.current.language,
          })
        )) as { ok?: boolean; text?: string; error?: string };
        if (!res?.ok) {
          optionsRef.current.onNotice?.(
            res?.error ?? 'I could not make that out. Please say it again.'
          );
          return { ok: false };
        }
        return { ok: Boolean(res.text), text: res.text };
      } catch {
        optionsRef.current.onNotice?.('I could not reach the speech service. Please say it again.');
        return { ok: false };
      }
    },
    []
  );

  /** Dispatches a finished utterance: an answer into the turn, or a new turn. */
  const handleTranscript = useCallback((text: string) => {
    optionsRef.current.onTranscript?.(text, metaRef.current);
    metaRef.current = { isBargeIn: false };
  }, []);

  const ensureMicrophone = useCallback(async (): Promise<boolean> => {
    const permission = await queryMicrophonePermission();
    if (permission === 'granted') return true;
    const granted = await requestMicrophoneAccess();
    if (granted || permission !== 'denied') return true;
    const message =
      'Microphone access is blocked. Open chrome://settings/content/microphone, remove Tederash from the blocked list, then try again.';
    dispatchRef.current({ type: 'engineError', message });
    optionsRef.current.onNotice?.(message);
    return false;
  }, []);

  const micFailure = useCallback((err: unknown) => {
    const message =
      err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        ? 'Microphone access is blocked. Open chrome://settings/content/microphone, remove Tederash from the blocked list, then try again.'
        : 'No microphone is available on this device.';
    dispatchRef.current({ type: 'engineError', message });
    optionsRef.current.onNotice?.(message);
  }, []);

  const startVadEngine = useCallback(async (): Promise<boolean> => {
    if (!(await ensureMicrophone())) return false;
    try {
      // Echo cancellation is what keeps the assistant from hearing itself: the
      // AEC removes its own speaker output from the mic signal, so its voice is
      // not mistaken for the user bargeing in.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const vad = await MicVAD.new({
        // Our own stream, with the constraints that stop the assistant hearing
        // itself through the speakers.
        getStream: async () => stream,
        pauseStream: async () => undefined,
        resumeStream: async (s) => s,
        startOnLoad: false,
        model: 'v5',
        baseAssetPath: assetPath(),
        onnxWASMBasePath: assetPath(),
        positiveSpeechThreshold: 0.4,
        negativeSpeechThreshold: 0.3,
        minSpeechMs: 400,
        // Deliberately generous: a ~700 ms endpoint cuts off real answers, and
        // users speaking slowly or through assistive tech need more.
        redemptionMs: optionsRef.current.pauseMs ?? DEFAULT_PAUSE_MS,
        preSpeechPadMs: 400,
        onSpeechStart: () => {
          if (stateRef.current.status === 'busy') {
            // Barge-in: stop whatever is being spoken right away.
            void stopAssistantSpeech();
            metaRef.current.isBargeIn = true;
          }
          dispatchRef.current({ type: 'speechStart' });
        },
        onSpeechEnd: (audio) => {
          if (busyCaptureRef.current) return;
          // Move capturing -> transcribing. Without this the transcript that comes
          // back is discarded (it is only accepted while transcribing) and the panel
          // sits on "Hearing you…" forever.
          dispatchRef.current({ type: 'speechEnd' });
          busyCaptureRef.current = true;
          void (async () => {
            const res = await sendForTranscription(audio);
            busyCaptureRef.current = false;
            if (stateRef.current.status !== 'transcribing') return;
            dispatchRef.current({ type: 'transcribed', ok: res.ok, hasText: Boolean(res.text) });
            if (res.ok && res.text) handleTranscript(res.text);
          })();
        },
        onVADMisfire: () => {
          dispatchRef.current({ type: 'misfire' });
        },
      });
      await vad.start();
      vadRef.current = vad;
      return true;
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      micFailure(err);
      return false;
    }
  }, [assetPath, ensureMicrophone, handleTranscript, micFailure, sendForTranscription]);

  const startLocalEngine = useCallback(async (): Promise<boolean> => {
    if (!(await ensureMicrophone())) return false;
    try {
      const controller = createSpeechRecognitionController({
        onResult: (result) => {
          if (!result.isFinal) {
            optionsRef.current.onInterim?.(result.transcript);
            return;
          }
          optionsRef.current.onInterim?.('');
          // Recognised locally, so no transcription step: a settled utterance
          // becomes a turn straight away. Nothing here runs while a turn is
          // active — recognition is paused for exactly that reason.
          if (busyCaptureRef.current || !result.transcript.trim()) return;
          if (stateRef.current.status !== 'listening') return;
          dispatchRef.current({ type: 'transcribed', ok: true, hasText: true });
          handleTranscript(result.transcript.trim());
        },
        onError: (message) => dispatchRef.current({ type: 'engineError', message }),
        onEnd: () => {
          // Continuous recognition ends on silence; restart it while we are
          // still listening so the mic never needs a second grant.
          if (stateRef.current.status === 'listening') {
            try {
              recognitionRef.current?.start({
                lang: optionsRef.current.language,
                continuous: true,
                interimResults: true,
              });
            } catch {
              // Already running.
            }
          }
        },
      });
      recognitionRef.current = controller;
      controller.start({ lang: optionsRef.current.language, continuous: true, interimResults: true });
      return true;
    } catch (err) {
      micFailure(err);
      return false;
    }
  }, [ensureMicrophone, handleTranscript, micFailure]);

  const stopEngine = useCallback(() => {
    try {
      vadRef.current?.destroy();
    } catch {
      // Already gone.
    }
    vadRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Already stopped.
    }
    recognitionRef.current = null;
  }, []);

  const toggle = useCallback(
    (enabled?: boolean) => {
      const next = enabled ?? stateRef.current.status === 'off';
      dispatchRef.current({ type: 'toggle', enabled: next });
      if (!next) {
        stopEngine();
        void stopAssistantSpeech();
        optionsRef.current.onNotice?.('Voice mode off.');
        return;
      }
      void (async () => {
        const started = optionsRef.current.canUpload ? await startVadEngine() : await startLocalEngine();
        if (!started) return; // engineError already moved the machine to 'off'.
        dispatchRef.current({ type: 'engineStarted' });
        optionsRef.current.onNotice?.('Voice mode on. I am listening.');
      })();
    },
    [startLocalEngine, startVadEngine, stopEngine]
  );

  // Releases the microphone and stops recognition if the panel closes.
  useEffect(() => stopEngine, [stopEngine]);

  // Local engine only: recognition must not run while the assistant is talking,
  // or it transcribes the assistant's own voice through the speakers. The VAD
  // tier stays live during turns, because barge-in needs to hear the user.
  useEffect(() => {
    if (vadRef.current) return;
    if (state.status === 'busy') {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Already stopped.
      }
      return;
    }
    if (state.status === 'listening' && recognitionRef.current) {
      try {
        recognitionRef.current?.start({
          lang: optionsRef.current.language,
          continuous: true,
          interimResults: true,
        });
      } catch {
        // Already running.
      }
    }
  }, [state.status]);


  const notifyTurnEnded = useCallback(() => dispatchRef.current({ type: 'turnEnded' }), []);

  return {
    enabled: state.status !== 'off',
    status: state.status,
    error: state.error,
    toggle,
    notifyTurnEnded,
  };
}

/**
 * Stops the assistant's speech. Voice mode barges in by stopping the audio and
 * listening; the spoken line is not finished, so it is not re-queued.
 */
function stopAssistantSpeech(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return Promise.resolve();
  return chrome.runtime
    .sendMessage(createEnvelope('tts/stop', {}))
    .then(() => undefined)
    .catch(() => undefined);
}

/** Packages 16 kHz mono samples as a 16-bit PCM WAV blob for the worker. */
export function encodeWavBlob(samples: Float32Array): Blob | undefined {
  if (typeof samples !== 'object' || samples.length === 0) return undefined;
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true); // 16 kHz * 2 bytes
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
