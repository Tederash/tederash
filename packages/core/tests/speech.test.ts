// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSpeechRecognitionController,
  createSpeechSynthesisController,
  getSpeechCapabilities,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from "../src";

/**
 * Minimal Web Speech API mocks (structurally compatible with our controllers)
 */
interface MockUtterance {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: unknown;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

class MockSpeechSynthesisUtterance implements MockUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function createMockSynthesis() {
  const spoken: MockUtterance[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  return {
    spoken,
    listeners,
    speak(utterance: MockUtterance) {
      spoken.push(utterance);
    },
    cancel() {
      spoken.length = 0;
    },
    pause() {},
    resume() {},
    getVoices() {
      return [
        {
          name: "Google US English",
          lang: "en-US",
          default: true,
          localService: false,
          voiceURI: "google-us",
        },
        {
          name: "Noto Sans Amharic",
          lang: "am-ET",
          default: false,
          localService: true,
          voiceURI: "am-et",
        },
      ];
    },
    addEventListener(type: string, listener: () => void) {
      (listeners[type] ??= []).push(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
    },
  };
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
  }
  abort() {
    this.started = false;
  }
  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

/** Returns the most recently created recognition instance */
function lastRecognition(): MockSpeechRecognition {
  return MockSpeechRecognition.instances[
    MockSpeechRecognition.instances.length - 1
  ];
}

const w = window as unknown as Record<string, unknown>;

describe("Speech capability detection", () => {
  afterEach(() => {
    delete w.speechSynthesis;
    delete w.SpeechSynthesisUtterance;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });

  it("reports no capabilities in a bare environment", () => {
    expect(isSpeechSynthesisSupported()).toBe(false);
    expect(isSpeechRecognitionSupported()).toBe(false);
    expect(getSpeechCapabilities()).toEqual({
      synthesis: false,
      recognition: false,
    });
  });

  it("detects available synthesis and recognition APIs", () => {
    w.speechSynthesis = createMockSynthesis();
    w.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    w.SpeechRecognition = MockSpeechRecognition;

    expect(getSpeechCapabilities()).toEqual({
      synthesis: true,
      recognition: true,
    });
  });

  it("detects webkitSpeechRecognition fallback", () => {
    w.webkitSpeechRecognition = MockSpeechRecognition;
    expect(isSpeechRecognitionSupported()).toBe(true);
  });
});

describe("Speech synthesis controller", () => {
  let synth: ReturnType<typeof createMockSynthesis>;

  beforeEach(() => {
    synth = createMockSynthesis();
    w.speechSynthesis = synth;
    w.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    delete w.speechSynthesis;
    delete w.SpeechSynthesisUtterance;
  });

  it("speaks text with clamped options and voice selection", () => {
    const controller = createSpeechSynthesisController();
    controller.speak("ሰላም ዓለም", {
      lang: "am-ET",
      rate: 99,
      pitch: -5,
      volume: 2,
      voiceName: "Noto Sans Amharic",
    });

    expect(synth.spoken).toHaveLength(1);
    const utterance = synth.spoken[0];
    expect(utterance.text).toBe("ሰላም ዓለም");
    expect(utterance.lang).toBe("am-ET");
    expect(utterance.rate).toBe(10); // clamped to max
    expect(utterance.pitch).toBe(0); // clamped to min
    expect(utterance.volume).toBe(1); // clamped to max
    expect((utterance.voice as { name: string }).name).toBe("Noto Sans Amharic");
  });

  it("applies default options when per-call options are omitted", () => {
    const controller = createSpeechSynthesisController({
      defaultOptions: { lang: "en-US", rate: 0.8 },
    });
    controller.speak("Hello world");

    expect(synth.spoken[0].lang).toBe("en-US");
    expect(synth.spoken[0].rate).toBe(0.8);
  });

  it("tracks speaking state through the utterance lifecycle", () => {
    const controller = createSpeechSynthesisController();
    const onEnd = vi.fn();

    controller.speak("Hello", { onEnd });
    expect(controller.isSpeaking()).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();

    synth.spoken[0].onend?.();
    expect(controller.isSpeaking()).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("reports errors via onError and resets speaking state", () => {
    const onError = vi.fn();
    const onEnd = vi.fn();
    const controller = createSpeechSynthesisController();

    controller.speak("Hello", { onError, onEnd });
    synth.spoken[0].onerror?.({ error: "not-allowed" });

    expect(controller.isSpeaking()).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      "Speech synthesis is not allowed on this page."
    );
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("supports pause and resume state tracking", () => {
    const controller = createSpeechSynthesisController();
    controller.speak("Hello");
    controller.pause();
    expect(controller.isPaused()).toBe(true);
    controller.resume();
    expect(controller.isPaused()).toBe(false);
  });

  it("cancel resets speaking state and clears the queue", () => {
    const controller = createSpeechSynthesisController();
    controller.speak("Hello");
    expect(controller.isSpeaking()).toBe(true);
    controller.cancel();
    expect(controller.isSpeaking()).toBe(false);
    expect(synth.spoken).toHaveLength(0);
  });

  it("lists available voices", () => {
    const controller = createSpeechSynthesisController();
    const voices = controller.getVoices();
    expect(voices).toHaveLength(2);
    expect(voices[0]).toEqual({
      name: "Google US English",
      lang: "en-US",
      default: true,
      localService: false,
    });
  });

  it("degrades gracefully with onError when synthesis is unsupported", () => {
    delete w.speechSynthesis;
    const onError = vi.fn();
    const onEnd = vi.fn();
    const controller = createSpeechSynthesisController();

    controller.speak("Hello", { onError, onEnd });

    expect(onError).toHaveBeenCalledWith(
      "Speech synthesis is not supported in this environment."
    );
    expect(onEnd).not.toHaveBeenCalled();
    expect(controller.isSpeaking()).toBe(false);
  });
});

describe("Speech recognition controller", () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    w.SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });

  function makeResultEvent(
    items: Array<{ transcript: string; isFinal: boolean }>
  ) {
    return {
      resultIndex: 0,
      results: items.map((item) => ({
        0: { transcript: item.transcript },
        isFinal: item.isFinal,
        length: 1,
      })),
    };
  }

  it("starts a session with configured options", () => {
    const controller = createSpeechRecognitionController({
      defaultOptions: { lang: "am-ET", continuous: true, interimResults: true },
    });

    controller.start();
    expect(controller.isListening()).toBe(true);
  });

  it("delivers final and interim results through onResult", () => {
    const onResult = vi.fn();
    const controller = createSpeechRecognitionController({ onResult });
    controller.start();

    const instance = lastRecognition();
    instance.onresult?.(
      makeResultEvent([
        { transcript: "ሰላም", isFinal: true },
        { transcript: "ሰላም ለ", isFinal: false },
      ])
    );

    expect(onResult).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenNthCalledWith(1, {
      transcript: "ሰላም",
      isFinal: true,
    });
    expect(onResult).toHaveBeenNthCalledWith(2, {
      transcript: "ሰላም ለ",
      isFinal: false,
    });
  });

  it("calls onEnd when a session ends", () => {
    const onEnd = vi.fn();
    const controller = createSpeechRecognitionController({ onEnd });
    controller.start();

    const instance = lastRecognition();
    expect(controller.isListening()).toBe(true);
    instance.onend?.();
    expect(controller.isListening()).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("maps recognition errors to friendly messages", () => {
    const onError = vi.fn();
    const controller = createSpeechRecognitionController({ onError });
    controller.start();

    const instance = lastRecognition();
    instance.onerror?.({ error: "not-allowed" });

    expect(onError).toHaveBeenCalledWith(
      "Microphone access was denied. Voice input is unavailable."
    );
    expect(controller.isListening()).toBe(false);
  });

  it("stop() ends listening without discarding results", () => {
    const controller = createSpeechRecognitionController();
    controller.start();
    controller.stop();
    expect(controller.isListening()).toBe(false);
  });

  it("degrades gracefully with onError when recognition is unsupported", () => {
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    const onError = vi.fn();
    const controller = createSpeechRecognitionController({ onError });

    controller.start();

    expect(controller.isListening()).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      "Speech recognition is not supported in this environment."
    );
  });
});
