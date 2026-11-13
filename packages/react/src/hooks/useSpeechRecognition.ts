import * as React from "react";
import {
  SpeechRecognitionController,
  SpeechRecognitionOptions,
  createSpeechRecognitionController,
  isSpeechRecognitionSupported,
} from "@tederash/core";

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
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSupported] = React.useState(() => isSpeechRecognitionSupported());

  const [controller] = React.useState<SpeechRecognitionController>(() =>
    createSpeechRecognitionController({
      defaultOptions: options,
      onResult: (result) => {
        if (result.isFinal) {
          setTranscript((prev) =>
            prev ? `${prev} ${result.transcript}` : result.transcript
          );
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
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    startListening,
    stopListening,
    abortListening,
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    resetTranscript,
  };
}
