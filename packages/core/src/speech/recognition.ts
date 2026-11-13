/**
 * Speech recognition (voice dictation) controller.
 * Wraps SpeechRecognition / webkitSpeechRecognition with continuous listening,
 * interim and final transcript callbacks, and graceful fallbacks.
 */

import {
  SpeechRecognitionController,
  SpeechRecognitionControllerOptions,
  SpeechRecognitionOptions,
  SpeechRecognitionResultInfo,
} from "./types";
import { getSpeechRecognitionCtor } from "./capabilities";

interface RecognitionResultAlternative {
  transcript: string;
}

interface RecognitionResultItem {
  readonly length: number;
  isFinal: boolean;
  [index: number]: RecognitionResultAlternative;
}

interface RecognitionEventLike {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResultItem };
}

interface RecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtorLike = new () => RecognitionInstanceLike;

function getRecognitionErrorMessage(error?: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied. Voice input is unavailable.";
    case "no-speech":
      return "No speech was detected. Please try again.";
    case "audio-capture":
      return "No microphone was found. Check your audio input settings.";
    case "network":
      return "A network error interrupted speech recognition.";
    case "language-not-supported":
      return "The requested speech recognition language is not supported.";
    default:
      return "An unknown speech recognition error occurred.";
  }
}

export function createSpeechRecognitionController(
  options: SpeechRecognitionControllerOptions = {}
): SpeechRecognitionController {
  let instance: RecognitionInstanceLike | null = null;
  let listening = false;

  const teardown = () => {
    listening = false;
    instance = null;
  };

  const extractTranscript = (
    event: RecognitionEventLike,
    isFinal: boolean
  ): string => {
    const parts: string[] = [];
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result || result.isFinal !== isFinal) continue;
      const alternative = result[0];
      if (alternative?.transcript) parts.push(alternative.transcript);
    }
    return parts.join(" ");
  };

  return {
    start(startOptions) {
      const merged: SpeechRecognitionOptions = {
        ...options.defaultOptions,
        ...startOptions,
      };
      const Ctor = getSpeechRecognitionCtor() as RecognitionCtorLike | null;

      if (!Ctor) {
        options.onError?.(
          "Speech recognition is not supported in this environment."
        );
        return;
      }

      // A previous session may still be active; discard it.
      if (listening && instance) {
        instance.onresult = null;
        instance.onerror = null;
        instance.onend = null;
        try {
          instance.abort();
        } catch {
          // Ignore abort failures on stale sessions
        }
      }

      const recognition = new Ctor();
      recognition.lang = merged.lang ?? "en-US";
      recognition.continuous = merged.continuous ?? false;
      recognition.interimResults = merged.interimResults ?? true;

      recognition.onresult = (event) => {
        const finalTranscript = extractTranscript(event, true);
        if (finalTranscript) {
          const finalResult: SpeechRecognitionResultInfo = {
            transcript: finalTranscript,
            isFinal: true,
          };
          options.onResult?.(finalResult);
        }
        const interimTranscript = extractTranscript(event, false);
        if (interimTranscript) {
          const interimResult: SpeechRecognitionResultInfo = {
            transcript: interimTranscript,
            isFinal: false,
          };
          options.onResult?.(interimResult);
        }
      };

      recognition.onerror = (event) => {
        // Recognition sessions typically terminate after an error
        listening = false;
        options.onError?.(getRecognitionErrorMessage(event?.error));
      };

      recognition.onend = () => {
        const wasInstance = instance;
        teardown();
        if (wasInstance) options.onEnd?.();
      };

      instance = recognition;
      recognition.start();
      listening = true;
    },

    stop() {
      if (listening && instance) {
        // Reflect the stopped state immediately; final results may still arrive
        listening = false;
        instance.stop();
      }
    },

    abort() {
      if (listening && instance) {
        instance.onresult = null;
        instance.onerror = null;
        instance.onend = null;
        instance.abort();
        teardown();
      }
    },

    isListening() {
      return listening;
    },
  };
}
