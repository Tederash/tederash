import * as React from "react";
import {
  SpeechRecognitionController,
  SpeechRecognitionOptions,
  createSpeechRecognitionController,
  isSpeechRecognitionSupported,
} from "@tederash/core";

/** Support never changes after load, so there is nothing to subscribe to. */
const subscribeNoop = () => () => {};

export interface UseSpeechRecognitionOptions extends SpeechRecognitionOptions {}

export interface UseSpeechRecognitionResult {
  /** Begin a dictation session */
  startListening: (options?: SpeechRecognitionOptions) => void;
  /** Gracefully stop the dictation session, keeping recognized text */
  stopListening: () => void;
  /** Immediately discard the dictation session */
  abortListening: () => void;
  /** Confirmed final transcript accumulated across the session */
  transcript: string;
  /**
   * Alternative readings of the whole `transcript`, best first (first entry
   * equals `transcript`). Contains more than one entry only when the engine
   * returned alternatives (request them with `maxAlternatives`).
   */
  alternatives: string[];
  /** Unconfirmed in-progress transcript */
  interimTranscript: string;
  /** Whether a dictation session is active */
  isListening: boolean;
  /** Whether the Web Speech recognition API is available */
  isSupported: boolean;
  /** Last error message, or null */
  error: string | null;
  /** Clear the accumulated transcript and error */
  resetTranscript: () => void;
}

/**
 * React hook for voice dictation into form fields. Automatically aborts any
 * active session on unmount.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const [transcript, setTranscript] = React.useState("");
  const [alternatives, setAlternatives] = React.useState<string[]>([]);
  const transcriptRef = React.useRef("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // false during SSR and hydration (matches server markup), real value after.
  const isSupported = React.useSyncExternalStore(
    subscribeNoop,
    isSpeechRecognitionSupported,
    () => false
  );

  const [controller] = React.useState<SpeechRecognitionController>(() =>
    createSpeechRecognitionController({
      defaultOptions: options,
      onResult: (result) => {
        if (result.isFinal) {
          const prev = transcriptRef.current;
          const join = (chunk: string) => (prev ? `${prev} ${chunk}` : chunk);
          const next = join(result.transcript);
          transcriptRef.current = next;
          setTranscript(next);
          setAlternatives((result.alternatives ?? [result.transcript]).map(join));
          setInterimTranscript("");
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      onError: (message) => {
        setError(message);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    })
  );

  // Abort any active session on unmount
  React.useEffect(() => {
    return () => controller.abort();
  }, [controller]);

  const startListening = React.useCallback(
    (startOptions?: SpeechRecognitionOptions) => {
      setError(null);
      controller.start(startOptions);
      setIsListening(controller.isListening());
    },
    [controller]
  );

  const stopListening = React.useCallback(() => {
    controller.stop();
    setIsListening(controller.isListening());
  }, [controller]);

  const abortListening = React.useCallback(() => {
    controller.abort();
    setIsListening(false);
  }, [controller]);

  const resetTranscript = React.useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
    setAlternatives([]);
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    startListening,
    stopListening,
    abortListening,
    transcript,
    alternatives,
    interimTranscript,
    isListening,
    isSupported,
    error,
    resetTranscript,
  };
}
