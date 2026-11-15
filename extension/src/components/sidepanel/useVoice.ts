import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeechRecognitionController } from '@tederash/core';

/**
 * Microphone capture for the side panel, in two tiers:
 *
 * 1. With a speech key configured, record audio and hand it to the service worker,
 *    which transcribes it with Whisper (better accuracy, and it works for languages
 *    the browser has no recogniser for).
 * 2. With no key, recognise locally with the Web Speech API — no audio leaves the
 *    device, and interim words appear while the user is still talking.
 *
 * Both tiers return plain text to the caller.
 */

export type CaptureMode = 'upload' | 'local';

export interface CaptureResult {
  /** Final text, when recognised locally. */
  text?: string;
  /** Recorded audio for the background to transcribe. */
  audioBase64?: string;
  mimeType?: string;
  cancelled?: boolean;
  error?: string;
}

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_MIME_TYPES.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

/** Chunked so a long recording cannot blow the argument limit of fromCharCode. */
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function canRecordAudio(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function canRecogniseLocally(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** 'granted' | 'prompt' | 'denied', or undefined when the browser will not say. */
export async function queryMicrophonePermission(): Promise<PermissionState | undefined> {
  try {
    const status = await navigator.permissions?.query({
      name: 'microphone' as PermissionName,
    });
    return status?.state;
  } catch {
    return undefined;
  }
}

const PERMISSION_PAGE = 'microphone.html';
const PERMISSION_TIMEOUT_MS = 90_000;

/**
 * Gets microphone access by opening the request page in a tab.
 *
 * Chrome anchors its microphone prompt to a tab, so requesting from the side panel
 * never shows a dialog — it just fails. Granting it on a tab applies to the whole
 * extension origin, so this happens once.
 */
export function requestMicrophoneAccess(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.create || !chrome.runtime?.onMessage) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const onMessage = (msg: unknown) => {
      const m = msg as { type?: string; granted?: boolean } | null;
      if (m?.type !== 'mic/permissionResult') return;
      finish(m.granted === true);
    };
    const timer = setTimeout(() => finish(false), PERMISSION_TIMEOUT_MS);
    const finish = (granted: boolean) => {
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(onMessage);
      resolve(granted);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    try {
      void chrome.tabs.create({ url: chrome.runtime.getURL(PERMISSION_PAGE) });
    } catch {
      finish(false);
    }
  });
}

export interface UseVoiceOptions {
  language?: string;
  /** True when a speech key is configured, so audio can be uploaded for transcription. */
  canUpload: boolean;
  onInterim?: (text: string) => void;
}

export function useVoice({ language, canUpload, onInterim }: UseVoiceOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** True while the permission tab is open, so the panel can say what is happening. */
  const [needsPermission, setNeedsPermission] = useState(false);

  const settleRef = useRef<((result: CaptureResult) => void) | null>(null);
  /** Set for the whole of a capture, including while the mic prompt is open. */
  const busyRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognitionController> | null>(null);

  const mode: CaptureMode = canUpload && canRecordAudio() ? 'upload' : 'local';
  const isSupported = canRecordAudio() || canRecogniseLocally();

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsCapturing(false);
  }, []);

  const settle = useCallback(
    (result: CaptureResult) => {
      const resolve = settleRef.current;
      settleRef.current = null;
      busyRef.current = false;
      cleanup();
      resolve?.(result);
    },
    [cleanup]
  );

  // Releases the microphone if the panel closes mid-capture.
  useEffect(() => cleanup, [cleanup]);

  /**
   * Makes sure the extension has microphone permission, asking on a tab when it does
   * not — the side panel cannot raise Chrome's prompt itself. Both the recorder and
   * Web Speech recognition need this.
   */
  const ensurePermission = useCallback(async (): Promise<void> => {
    const state = await queryMicrophonePermission();
    if (state === 'granted') return;
    setNeedsPermission(true);
    try {
      const granted = await requestMicrophoneAccess();
      if (!granted && state === 'denied') {
        throw new DOMException('Microphone blocked', 'NotAllowedError');
      }
    } finally {
      setNeedsPermission(false);
    }
  }, []);

  const startUpload = useCallback(async (): Promise<CaptureResult> => {
    const mimeType = pickMimeType();
    await ensurePermission();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    return new Promise<CaptureResult>((resolve) => {
      settleRef.current = resolve;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => settle({ error: 'The microphone stopped unexpectedly.' });
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (blob.size === 0) {
          settle({ cancelled: true });
          return;
        }
        settle({ audioBase64: toBase64(await blob.arrayBuffer()), mimeType: blob.type });
      };
      recorder.start();
      setIsCapturing(true);
    });
  }, [ensurePermission, settle]);

  const startLocal = useCallback(async (): Promise<CaptureResult> => {
    await ensurePermission();
    return new Promise<CaptureResult>((resolve) => {
      settleRef.current = resolve;
      let finalText = '';
      const controller = createSpeechRecognitionController({
        onResult: (result) => {
          if (result.isFinal) finalText = `${finalText} ${result.transcript}`.trim();
          else onInterim?.(result.transcript);
        },
        onError: (message) => settle({ error: message }),
        onEnd: () => settle(finalText ? { text: finalText } : { cancelled: true }),
      });
      recognitionRef.current = controller;
      controller.start({ lang: language, continuous: true, interimResults: true });
      setIsCapturing(true);
    });
  }, [ensurePermission, language, onInterim, settle]);

  /** Starts listening; resolves when `stop` is called, or on error. */
  const capture = useCallback(async (): Promise<CaptureResult> => {
    // Checked against a ref, not state: a second caller in the same tick would
    // otherwise replace the pending resolver and strand the first promise.
    if (busyRef.current) return { cancelled: true };
    busyRef.current = true;
    setError(undefined);
    try {
      return mode === 'upload' ? await startUpload() : await startLocal();
    } catch (err) {
      settleRef.current = null;
      busyRef.current = false;
      setNeedsPermission(false);
      cleanup();
      const message =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ? 'Microphone access is blocked. Open chrome://settings/content/microphone, remove Tederash from the blocked list, then try again.'
          : 'No microphone is available on this device.';
      setError(message);
      return { error: message };
    }
  }, [cleanup, mode, startLocal, startUpload]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    settle({ cancelled: true });
  }, [settle]);

  const cancel = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    settle({ cancelled: true });
  }, [settle]);

  return { capture, stop, cancel, isCapturing, isSupported, mode, error, needsPermission };
}
