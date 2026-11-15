/**
 * Speech & Voice Interaction Types (Layer 4: Interaction Engine)
 * Web Speech API abstractions with feature detection and graceful fallbacks.
 */

export interface SpeechCapabilities {
  /** Text-to-speech (`window.speechSynthesis`) is available */
  synthesis: boolean;
  /** Speech recognition / dictation (`SpeechRecognition` or `webkitSpeechRecognition`) is available */
  recognition: boolean;
}

/** Why synthesis did not run or stopped. */
export type SpeechSynthesisErrorCode =
  | "unsupported"
  | "no-voice-for-language"
  | "canceled"
  | "interrupted"
  | "not-allowed"
  | "language-not-supported"
  | "unknown";

/** Why recognition did not start or stopped. */
export type SpeechRecognitionErrorCode =
  | "unsupported"
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "language-not-supported"
  | "unknown";

export interface SpeechSynthesisOptions {
  /** Speech rate multiplier (0.1 - 10, default 1.0) */
  rate?: number;
  /** Speech pitch (0 - 2, default 1.0) */
  pitch?: number;
  /** Speech volume (0 - 1, default 1.0) */
  volume?: number;
  /** BCP-47 language tag, e.g. 'en-US', 'am-ET' */
  lang?: string;
  /** Preferred voice name (matched against available voices) */
  voiceName?: string;
  /** Called when the utterance finishes speaking successfully */
  onEnd?: () => void;
  /** Called when synthesis fails or is unavailable */
  onError?: (message: string, code: SpeechSynthesisErrorCode) => void;
}

export interface SpeechRecognitionOptions {
  /** BCP-47 language tag for recognition (e.g. 'en-US') */
  lang?: string;
  /** Keep listening until explicitly stopped (default false) */
  continuous?: boolean;
  /** Deliver partial/unconfirmed results while speaking (default true) */
  interimResults?: boolean;
  /** How many alternative transcriptions to request per result (default 1) */
  maxAlternatives?: number;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}

export interface SpeechRecognitionResultInfo {
  /** Accumulated transcript for this result batch */
  transcript: string;
  /** True when the transcript is final and confirmed */
  isFinal: boolean;
  /**
   * Final results only: alternative readings of `transcript`, best first
   * (the first entry equals `transcript`). Present when the engine returned
   * more than one candidate.
   */
  alternatives?: string[];
}

export type SpeechRecognitionResultHandler = (result: SpeechRecognitionResultInfo) => void;
export type SpeechErrorHandler = (message: string, code: SpeechRecognitionErrorCode) => void;

export interface SpeechSynthesisControllerOptions {
  /** Defaults applied to every speak() call unless explicitly overridden */
  defaultOptions?: SpeechSynthesisOptions;
}

export interface SpeechSynthesisController {
  /** Queue text for spoken output */
  speak(text: string, options?: SpeechSynthesisOptions): void;
  /** Stop all queued speech */
  cancel(): void;
  /** Pause ongoing speech */
  pause(): void;
  /** Resume paused speech */
  resume(): void;
  /** Whether any utterance is currently being spoken */
  isSpeaking(): boolean;
  /** Whether ongoing speech is currently paused */
  isPaused(): boolean;
  /** Available synthesis voices */
  getVoices(): VoiceInfo[];
  /**
   * The voice that would speak `lang`, or undefined when none is installed.
   * Also undefined while the browser has not loaded its voice list yet.
   */
  getVoiceForLanguage(lang?: string): VoiceInfo | undefined;
}

export interface SpeechRecognitionControllerOptions {
  /** Defaults applied to every start() call unless explicitly overridden */
  defaultOptions?: SpeechRecognitionOptions;
  /** Called for interim and final transcript batches */
  onResult?: SpeechRecognitionResultHandler;
  /** Called when recognition fails or is unsupported */
  onError?: SpeechErrorHandler;
  /** Called when a recognition session ends for any reason */
  onEnd?: () => void;
}

export interface SpeechRecognitionController {
  /** Begin a recognition (dictation) session */
  start(options?: SpeechRecognitionOptions): void;
  /** Gracefully stop the active session, keeping recognized text */
  stop(): void;
  /** Immediately discard the active session */
  abort(): void;
  /** Whether a recognition session is active */
  isListening(): boolean;
}
