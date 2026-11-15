import * as React from "react";
import {
  SpeechSynthesisController,
  SpeechSynthesisErrorCode,
  SpeechSynthesisOptions,
  VoiceInfo,
  createSpeechSynthesisController,
  findVoiceForLanguage,
  isSpeechSynthesisSupported,
} from "@tederash/core";

/** Support never changes after load, so there is nothing to subscribe to. */
const subscribeNoop = () => () => {};

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
  /** True once the browser has reported its voice list (it can arrive after mount). */
  voicesLoaded: boolean;
  /** The voice that would speak `lang`, or undefined when none is installed (or voices are not loaded yet). */
  voiceForLanguage: (lang?: string) => VoiceInfo | undefined;
  /**
   * True when voices are loaded and none speaks `lang`. Use it to tell the
   * user read-aloud is unavailable for their language rather than failing silently.
   */
  isVoiceMissing: (lang?: string) => boolean;
  /** Message and code of the last failed speak() call, cleared by the next one. */
  error: { message: string; code: SpeechSynthesisErrorCode } | null;
}

/**
 * React hook for text-to-speech output. Automatically cancels ongoing speech
 * on unmount and tracks speaking/paused state.
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisResult {
  // false during SSR and hydration (matches server markup), real value after.
  const isSupported = React.useSyncExternalStore(
    subscribeNoop,
    isSpeechSynthesisSupported,
    () => false
  );
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [voices, setVoices] = React.useState<VoiceInfo[]>([]);
  const [error, setError] = React.useState<UseSpeechSynthesisResult["error"]>(null);

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
      setError(null);
      controller.speak(text, {
        ...speakOptions,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          speakOptions?.onEnd?.();
        },
        onError: (message, code) => {
          setIsSpeaking(false);
          setIsPaused(false);
          setError({ message, code });
          speakOptions?.onError?.(message, code);
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

  const voiceForLanguage = React.useCallback(
    (lang?: string) => findVoiceForLanguage(voices, lang),
    [voices]
  );
  const isVoiceMissing = React.useCallback(
    (lang?: string) => voices.length > 0 && Boolean(lang) && !findVoiceForLanguage(voices, lang),
    [voices]
  );

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    voicesLoaded: voices.length > 0,
    voiceForLanguage,
    isVoiceMissing,
    error,
  };
}
