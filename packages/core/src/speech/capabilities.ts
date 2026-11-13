/**
 * Speech capability detection.
 * Capability-aware feature detection so callers can degrade gracefully (SSR-safe).
 */

import { SpeechCapabilities } from "./types";

/** Minimal constructor shape of SpeechRecognition implementations */
export interface SpeechRecognitionCtorLike {
  new (): unknown;
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtorLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w["SpeechRecognition"] ?? w["webkitSpeechRecognition"];
  return typeof ctor === "function" ? (ctor as SpeechRecognitionCtorLike) : null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function getSpeechCapabilities(): SpeechCapabilities {
  return {
    synthesis: isSpeechSynthesisSupported(),
    recognition: isSpeechRecognitionSupported(),
  };
}
