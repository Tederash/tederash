import * as React from "react";
import {
  SpeechSynthesisController,
  SpeechSynthesisOptions,
  VoiceInfo,
  createSpeechSynthesisController,
  isSpeechSynthesisSupported,
} from "@tederash/core";

export interface UseSpeechSynthesisOptions extends SpeechSynthesisOptions {}

export interface UseSpeechSynthesisResult {
  /** Speak text aloud */
  speak: (text: string, options?: SpeechSynthesisOptions) => void;
  /** Stop all queued speech */
  cancel: () => void;
  /** Pause ongoing speech */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
  /** Whether any utterance is currently being spoken */
  isSpeaking: boolean;
  /** Whether ongoing speech is paused */
  isPaused: boolean;
  /** Whether the Web Speech synthesis API is available */
  isSupported: boolean;
  /** Available synthesis voices */
  voices: VoiceInfo[];
}

/**
 * React hook for text-to-speech output. Automatically cancels ongoing speech
 * on unmount and tracks speaking/paused state.
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisResult {
  const [isSupported] = React.useState(() => isSpeechSynthesisSupported());
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [voices, setVoices] = React.useState<VoiceInfo[]>([]);

  // Stable controller instance for the lifetime of the component
  const [controller] = React.useState<SpeechSynthesisController>(() =>
    createSpeechSynthesisController({ defaultOptions: options })
  );

  // Load voices and keep them in sync with voiceschanged
  React.useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => setVoices(controller.getVoices());
    loadVoices();
    const synth = (window as unknown as {
      speechSynthesis: {
        addEventListener?: (t: string, l: () => void) => void;
        removeEventListener?: (t: string, l: () => void) => void;
      };
    }).speechSynthesis;
    // Some engines/polyfills expose speechSynthesis without EventTarget methods.
    if (typeof synth?.addEventListener !== "function") return;
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener?.("voiceschanged", loadVoices);
  }, [controller, isSupported]);

  // Cancel ongoing speech on unmount
  React.useEffect(() => {
    return () => controller.cancel();
  }, [controller]);

  const speak = React.useCallback(
    (text: string, speakOptions?: SpeechSynthesisOptions) => {
      controller.speak(text, {
        ...speakOptions,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          speakOptions?.onEnd?.();
        },
        onError: (message) => {
          setIsSpeaking(false);
          setIsPaused(false);
          speakOptions?.onError?.(message);
        },
      });
      // Only reflect speaking state when the engine accepted the utterance
      setIsSpeaking(controller.isSpeaking());
      setIsPaused(false);
    },
    [controller]
  );

  const cancel = React.useCallback(() => {
    controller.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [controller]);

  const pause = React.useCallback(() => {
    controller.pause();
    setIsPaused(controller.isPaused());
  }, [controller]);

  const resume = React.useCallback(() => {
    controller.resume();
    setIsPaused(controller.isPaused());
  }, [controller]);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
  };
}
