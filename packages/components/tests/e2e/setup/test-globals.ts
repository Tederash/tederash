// @vitest-environment jsdom
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// 1. MatchMedia Mock
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// 2. Observer Mocks
export class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

export class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

if (typeof window !== "undefined") {
  (window as any).ResizeObserver = MockResizeObserver;
  (global as any).ResizeObserver = MockResizeObserver;
  (window as any).IntersectionObserver = MockIntersectionObserver;
  (global as any).IntersectionObserver = MockIntersectionObserver;
}

// 3. Pointer capture & scroll mocks
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

// 4. HTMLCanvasElement getContext (silences axe-core canvas warning)
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn();
}

// 5. Native HTMLDialogElement Mocks
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
}

// 6. SpeechSynthesis Mock (TTS)
export class MockSpeechSynthesisUtterance {
  text: string;
  lang = "en-US";
  rate = 1.0;
  pitch = 1.0;
  volume = 1.0;
  voice: any = null;
  onstart: ((e: any) => void) | null = null;
  onend: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onpause: ((e: any) => void) | null = null;
  onresume: ((e: any) => void) | null = null;

  constructor(text = "") {
    this.text = text;
  }
}

export class MockSpeechSynthesis {
  speaking = false;
  pending = false;
  paused = false;
  lastUtterance: MockSpeechSynthesisUtterance | null = null;
  spokenQueue: MockSpeechSynthesisUtterance[] = [];

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    this.lastUtterance = utterance;
    this.spokenQueue.push(utterance);
    utterance.onstart?.({ utterance });
    setTimeout(() => {
      this.speaking = false;
      utterance.onend?.({ utterance });
    }, 10);
  }

  cancel() {
    this.speaking = false;
    this.spokenQueue = [];
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  getVoices() {
    return [
      { name: "English (US)", lang: "en-US", default: true },
      { name: "Amharic (ET)", lang: "am-ET", default: false },
    ];
  }
}

if (typeof window !== "undefined") {
  (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

  const mockSynthesis = new MockSpeechSynthesis();
  Object.defineProperty(window, "speechSynthesis", {
    writable: true,
    configurable: true,
    value: mockSynthesis,
  });
}

// 7. SpeechRecognition Mock (STT)
export class MockSpeechRecognition {
  static lastInstance: MockSpeechRecognition | null = null;

  continuous = false;
  interimResults = false;
  lang = "en-US";
  onstart: ((e: any) => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: ((e: any) => void) | null = null;
  isListening = false;

  constructor() {
    MockSpeechRecognition.lastInstance = this;
  }

  start() {
    this.isListening = true;
    this.onstart?.({});
  }

  stop() {
    this.isListening = false;
    this.onend?.({});
  }

  abort() {
    this.isListening = false;
    this.onend?.({});
  }

  simulateResult(transcript: string, isFinal = true) {
    this.onresult?.({
      results: [
        Object.assign([{ transcript, confidence: 0.95 }], { isFinal }),
      ],
      resultIndex: 0,
    });
  }

  simulateError(errorType: string) {
    this.onerror?.({ error: errorType, message: `Recognition error: ${errorType}` });
    this.isListening = false;
    this.onend?.({});
  }
}

if (typeof window !== "undefined") {
  (window as any).SpeechRecognition = MockSpeechRecognition;
  (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  (global as any).SpeechRecognition = MockSpeechRecognition;
  (global as any).webkitSpeechRecognition = MockSpeechRecognition;
}

// 8. Lifecycle Teardown: Prevent test pollution across test files
afterEach(() => {
  cleanup();

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear();
  }

  // Clear root document styling and attributes injected by AccessibilityProvider
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.cssText = "";
    const attrs = Array.from(root.attributes).map((a) => a.name);
    for (const attr of attrs) {
      if (attr.startsWith("data-a11y-") || attr.startsWith("data-theme")) {
        root.removeAttribute(attr);
      }
    }
  }

  // Reset speech synthesis state
  if (typeof window !== "undefined" && (window as any).speechSynthesis?.cancel) {
    (window as any).speechSynthesis.cancel();
  }
});
