/**
 * Speech synthesis (text-to-speech) controller.
 * Wraps window.speechSynthesis with state tracking, clamped options,
 * voice selection, and graceful fallback when the API is unavailable.
 */

import {
  SpeechSynthesisController,
  SpeechSynthesisControllerOptions,
  SpeechSynthesisErrorCode,
  SpeechSynthesisOptions,
  VoiceInfo,
} from "./types";
import { isSpeechSynthesisSupported } from "./capabilities";
import { findVoiceForLanguage } from "./voices";

/** Minimal utterance shape to avoid relying on non-standard DOM typings */
interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: unknown;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

type UtteranceCtorLike = new (text: string) => UtteranceLike;

interface SynthWindowLike {
  speechSynthesis: {
    speak(utterance: UtteranceLike): void;
    cancel(): void;
    pause(): void;
    resume(): void;
    getVoices(): Array<{
      name: string;
      lang: string;
      default?: boolean;
      localService?: boolean;
      voiceURI: string;
    }>;
  };
  SpeechSynthesisUtterance?: UtteranceCtorLike;
}

function getSynthWindow(): SynthWindowLike | null {
  if (!isSpeechSynthesisSupported()) return null;
  return window as unknown as SynthWindowLike;
}

function getUtteranceCtor(w: SynthWindowLike): UtteranceCtorLike | null {
  if (w.SpeechSynthesisUtterance) return w.SpeechSynthesisUtterance;
  // Fall back to the ambient global constructor in real browsers
  const g = globalThis as unknown as Record<string, unknown>;
  return typeof g["SpeechSynthesisUtterance"] === "function"
    ? (g["SpeechSynthesisUtterance"] as UtteranceCtorLike)
    : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function describeSpeechError(error?: string): { message: string; code: SpeechSynthesisErrorCode } {
  switch (error) {
    case "canceled":
      return { message: "Speech was canceled.", code: "canceled" };
    case "interrupted":
      return { message: "Speech was interrupted.", code: "interrupted" };
    case "not-allowed":
      return { message: "Speech synthesis is not allowed on this page.", code: "not-allowed" };
    case "language-not-supported":
      return { message: "The requested speech language is not supported.", code: "language-not-supported" };
    default:
      return { message: "An unknown speech synthesis error occurred.", code: "unknown" };
  }
}

const toVoiceInfo = (v: { name: string; lang: string; default?: boolean; localService?: boolean }): VoiceInfo => ({
  name: v.name,
  lang: v.lang,
  default: Boolean(v.default),
  localService: Boolean(v.localService),
});

export function createSpeechSynthesisController(
  options: SpeechSynthesisControllerOptions = {}
): SpeechSynthesisController {
  let speaking = false;
  let paused = false;

  const mergeOptions = (
    override?: SpeechSynthesisOptions
  ): SpeechSynthesisOptions => ({ ...options.defaultOptions, ...override });

  const controller: SpeechSynthesisController = {
    speak(text, speakOptions) {
      const merged = mergeOptions(speakOptions);
      const w = getSynthWindow();
      const UtteranceCtor = w ? getUtteranceCtor(w) : null;

      if (!w || !UtteranceCtor) {
        speaking = false;
        paused = false;
        merged.onError?.(
          "Speech synthesis is not supported in this environment.",
          "unsupported"
        );
        return;
      }

      const voices = w.speechSynthesis.getVoices();
      // Refuse to read text in a language no installed voice speaks: an English
      // voice "reading" Amharic is noise, and the caller can tell the user instead.
      // An empty list means the browser has not loaded voices yet, so let it try.
      const voiceForLang =
        merged.voiceName === undefined && merged.lang && voices.length > 0
          ? findVoiceForLanguage(voices, merged.lang)
          : undefined;
      if (merged.voiceName === undefined && merged.lang && voices.length > 0 && !voiceForLang) {
        speaking = false;
        paused = false;
        merged.onError?.(
          `No voice is installed for ${merged.lang}.`,
          "no-voice-for-language"
        );
        return;
      }

      const utterance = new UtteranceCtor(text);
      if (merged.lang !== undefined) utterance.lang = merged.lang;
      if (merged.rate !== undefined) utterance.rate = clamp(merged.rate, 0.1, 10);
      if (merged.pitch !== undefined) utterance.pitch = clamp(merged.pitch, 0, 2);
      if (merged.volume !== undefined) utterance.volume = clamp(merged.volume, 0, 1);
      if (merged.voiceName !== undefined) {
        const voice = voices.find((v) => v.name === merged.voiceName);
        if (voice) utterance.voice = voice;
      } else if (voiceForLang) {
        utterance.voice = voiceForLang;
      }

      speaking = true;
      paused = false;

      utterance.onend = () => {
        speaking = false;
        paused = false;
        merged.onEnd?.();
      };
      utterance.onerror = (event) => {
        speaking = false;
        paused = false;
        const described = describeSpeechError(event?.error);
        // No voices at all when we spoke (Linux browsers without speech-dispatcher,
        // devices with no voice for the language): a failure is a missing voice,
        // which callers can explain, not an "unknown" error.
        const noVoices =
          voices.length === 0 &&
          w.speechSynthesis.getVoices().length === 0 &&
          described.code !== "canceled" &&
          described.code !== "interrupted";
        if (noVoices) {
          merged.onError?.(`No voice is installed for ${merged.lang ?? "this language"}.`, "no-voice-for-language");
        } else {
          merged.onError?.(described.message, described.code);
        }
      };

      w.speechSynthesis.speak(utterance);
    },

    cancel() {
      const w = getSynthWindow();
      if (w) w.speechSynthesis.cancel();
      speaking = false;
      paused = false;
    },

    pause() {
      const w = getSynthWindow();
      if (!w || !speaking) return;
      w.speechSynthesis.pause();
      paused = true;
    },

    resume() {
      const w = getSynthWindow();
      if (!w || !paused) return;
      w.speechSynthesis.resume();
      paused = false;
    },

    isSpeaking() {
      return speaking;
    },

    isPaused() {
      return paused;
    },

    getVoices() {
      const w = getSynthWindow();
      if (!w) return [];
      return w.speechSynthesis.getVoices().map(toVoiceInfo);
    },

    getVoiceForLanguage(lang) {
      const w = getSynthWindow();
      if (!w) return undefined;
      const voice = findVoiceForLanguage(w.speechSynthesis.getVoices(), lang);
      return voice ? toVoiceInfo(voice) : undefined;
    },
  };

  return controller;
}
