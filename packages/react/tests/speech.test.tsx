// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useSpeechRecognition,
  useSpeechSynthesis,
} from "../src";

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

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start() {}
  stop() {}
  abort() {}
  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

function lastRecognition(): MockSpeechRecognition {
  return MockSpeechRecognition.instances[
    MockSpeechRecognition.instances.length - 1
  ];
}

const w = window as unknown as Record<string, unknown>;

function installSpeechSupport() {
  const spoken: MockUtterance[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  const synth = {
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
          name: "English Voice",
          lang: "en-US",
          default: true,
          localService: false,
          voiceURI: "en",
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
  w.speechSynthesis = synth;
  w.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  w.SpeechRecognition = MockSpeechRecognition;
  return synth;
}

function uninstallSpeechSupport() {
  delete w.speechSynthesis;
  delete w.SpeechSynthesisUtterance;
  delete w.SpeechRecognition;
}

beforeEach(() => {
  MockSpeechRecognition.instances = [];
});

describe("useSpeechSynthesis", () => {
  afterEach(uninstallSpeechSupport);

  it("tells callers when no installed voice speaks a language, and records the refusal", () => {
    installSpeechSupport(); // English voice only
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.voicesLoaded).toBe(true);
    expect(result.current.voiceForLanguage("en-GB")?.name).toBe("English Voice");
    expect(result.current.isVoiceMissing("en-GB")).toBe(false);
    expect(result.current.isVoiceMissing("am-ET")).toBe(true);
    expect(result.current.isVoiceMissing(undefined)).toBe(false);

    const onError = vi.fn();
    act(() => result.current.speak("ሰላም", { lang: "am-ET", onError }));
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.error).toEqual({
      message: "No voice is installed for am-ET.",
      code: "no-voice-for-language",
    });
    expect(onError).toHaveBeenCalledWith("No voice is installed for am-ET.", "no-voice-for-language");

    act(() => result.current.speak("Hello", { lang: "en-US" }));
    expect(result.current.error).toBeNull();
    expect(result.current.isSpeaking).toBe(true);
  });

  it("reports isSupported false and no-ops gracefully without the API", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.voices).toEqual([]);

    expect(() => act(() => result.current.speak("Hello"))).not.toThrow();
    expect(result.current.isSpeaking).toBe(false);
  });

  it("speaks text with options and clears isSpeaking on end", () => {
    const synth = installSpeechSupport();
    const { result } = renderHook(() => useSpeechSynthesis({
      lang: "en-US",
      rate: 1.2,
    }));

    act(() => result.current.speak("Hello world"));
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].text).toBe("Hello world");
    expect(synth.spoken[0].lang).toBe("en-US");
    expect(synth.spoken[0].rate).toBe(1.2);
    expect(result.current.isSpeaking).toBe(true);

    act(() => synth.spoken[0].onend?.());
    expect(result.current.isSpeaking).toBe(false);
  });

  it("loads voices and refreshes on voiceschanged", () => {
    const synth = installSpeechSupport();
    const { result } = renderHook(() => useSpeechSynthesis());

    expect(result.current.voices).toHaveLength(1);
    expect(result.current.voices[0].name).toBe("English Voice");
    expect(synth.listeners["voiceschanged"]).toHaveLength(1);
  });

  it("cancel stops speech and clears the speaking state", () => {
    const synth = installSpeechSupport();
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => result.current.speak("Hello"));
    expect(result.current.isSpeaking).toBe(true);

    act(() => result.current.cancel());
    expect(result.current.isSpeaking).toBe(false);
    expect(synth.spoken).toHaveLength(0);
  });

  it("clears isSpeaking through onError callback", () => {
    const synth = installSpeechSupport();
    const onError = vi.fn();
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => result.current.speak("Hello", { onError }));
    expect(result.current.isSpeaking).toBe(true);

    act(() => synth.spoken[0].onerror?.({ error: "canceled" }));
    expect(result.current.isSpeaking).toBe(false);
    expect(onError).toHaveBeenCalled();
  });
});

describe("useSpeechRecognition", () => {
  afterEach(uninstallSpeechSupport);

  it("reports isSupported false and errors gracefully without the API", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);

    act(() => result.current.startListening());
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBe(
      "Speech recognition is not supported in this environment."
    );
  });

  it("accumulates final transcripts and tracks interim results", () => {
    installSpeechSupport();
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.startListening({ lang: "am-ET" }));
    expect(result.current.isListening).toBe(true);

    expect(lastRecognition().lang).toBe("am-ET");

    const instance = lastRecognition();
    const fire = (items: Array<{ transcript: string; isFinal: boolean }>) =>
      act(() =>
        instance.onresult?.({
          resultIndex: 0,
          results: items.map((item) => ({
            0: { transcript: item.transcript },
            isFinal: item.isFinal,
            length: 1,
          })),
        })
      );

    fire([{ transcript: "ኢሜይል አድራሻ", isFinal: false }]);
    expect(result.current.interimTranscript).toBe("ኢሜይል አድራሻ");
    expect(result.current.transcript).toBe("");

    fire([
      { transcript: "ኢሜይል አድራሻ", isFinal: true },
      { transcript: "ሙሉ ስም", isFinal: false },
    ]);
    expect(result.current.transcript).toBe("ኢሜይል አድራሻ");
    expect(result.current.interimTranscript).toBe("ሙሉ ስም");

    fire([{ transcript: "ሙሉ ስም", isFinal: true }]);
    expect(result.current.transcript).toBe("ኢሜይል አድራሻ ሙሉ ስም");
    expect(result.current.interimTranscript).toBe("");
  });

  it("stops listening via stop and end events", () => {
    installSpeechSupport();
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.startListening());
    act(() => result.current.stopListening());
    expect(result.current.isListening).toBe(false);

    act(() => result.current.startListening());
    act(() => lastRecognition().onend?.());
    expect(result.current.isListening).toBe(false);
  });

  it("surfaces recognition errors", () => {
    installSpeechSupport();
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.startListening());
    act(() => lastRecognition().onerror?.({ error: "no-speech" }));

    expect(result.current.error).toBe(
      "No speech was detected. Please try again."
    );
    expect(result.current.isListening).toBe(false);
  });

  it("resetTranscript clears accumulated text and error", () => {
    installSpeechSupport();
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.startListening());
    const instance = lastRecognition();
    act(() =>
      instance.onresult?.({
        resultIndex: 0,
        results: [
          {
            0: { transcript: "Hello" },
            isFinal: true,
            length: 1,
          },
        ],
      })
    );
    expect(result.current.transcript).toBe("Hello");

    act(() => result.current.resetTranscript());
    expect(result.current.transcript).toBe("");
    expect(result.current.interimTranscript).toBe("");
  });
});
