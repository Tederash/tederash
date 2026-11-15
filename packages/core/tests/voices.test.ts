// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSpeechSynthesisController,
  findVoiceForLanguage,
  hasVoiceForLanguage,
  primaryLanguage,
  voiceSpeaksLanguage,
} from "../src";

const VOICES = [
  { name: "Google US English", lang: "en-US", default: true, localService: false },
  { name: "Daniel", lang: "en_GB", default: false, localService: true },
  { name: "Amharic (Ethiopia)", lang: "am-ET", default: false, localService: true },
];

describe("voice matching", () => {
  it("compares primary language subtags, ignoring region and separator", () => {
    expect(primaryLanguage("am-ET")).toBe("am");
    expect(primaryLanguage("en_GB")).toBe("en");
    expect(primaryLanguage(undefined)).toBe("");
    expect(voiceSpeaksLanguage(VOICES[1]!, "en-US")).toBe(true);
    expect(voiceSpeaksLanguage(VOICES[0]!, "am-ET")).toBe(false);
    expect(voiceSpeaksLanguage(VOICES[0]!, "")).toBe(false);
  });

  it("prefers an exact tag, then a local voice in the same language", () => {
    expect(findVoiceForLanguage(VOICES, "en-US")?.name).toBe("Google US English");
    expect(findVoiceForLanguage(VOICES, "en-AU")?.name).toBe("Daniel");
    expect(findVoiceForLanguage(VOICES, "am")?.name).toBe("Amharic (Ethiopia)");
  });

  it("reports no voice for unsupported languages and for an empty (unloaded) list", () => {
    expect(hasVoiceForLanguage(VOICES, "ti-ET")).toBe(false);
    expect(hasVoiceForLanguage(VOICES.slice(0, 2), "am-ET")).toBe(false);
    expect(hasVoiceForLanguage([], "en-US")).toBe(false);
    expect(findVoiceForLanguage(VOICES, undefined)).toBeUndefined();
  });
});

interface MockUtterance {
  text: string;
  lang: string;
  voice: unknown;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

class MockUtteranceCtor implements MockUtterance {
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  constructor(public text: string) {}
}

describe("synthesis controller voice availability", () => {
  const w = window as unknown as Record<string, unknown>;
  const spoken: MockUtterance[] = [];
  let voices: typeof VOICES = VOICES;

  beforeEach(() => {
    spoken.length = 0;
    voices = VOICES;
    w.speechSynthesis = {
      speak: (u: MockUtterance) => spoken.push(u),
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      getVoices: () => voices.map((v) => ({ ...v, voiceURI: v.name })),
    };
    w.SpeechSynthesisUtterance = MockUtteranceCtor;
  });

  afterEach(() => {
    delete w.speechSynthesis;
    delete w.SpeechSynthesisUtterance;
  });

  it("picks the installed voice for the requested language", () => {
    const controller = createSpeechSynthesisController();
    controller.speak("ሰላም", { lang: "am-ET" });
    expect(spoken).toHaveLength(1);
    expect((spoken[0]!.voice as { name: string }).name).toBe("Amharic (Ethiopia)");
    expect(controller.getVoiceForLanguage("am")?.lang).toBe("am-ET");
    expect(controller.getVoiceForLanguage("ti")).toBeUndefined();
  });

  it("refuses to read a language no voice speaks and reports why", () => {
    voices = VOICES.slice(0, 2);
    const controller = createSpeechSynthesisController();
    const onError = vi.fn();
    controller.speak("ሰላም", { lang: "am-ET", onError });
    expect(spoken).toHaveLength(0);
    expect(controller.isSpeaking()).toBe(false);
    expect(onError).toHaveBeenCalledWith("No voice is installed for am-ET.", "no-voice-for-language");
  });

  it("still tries when the browser has not loaded its voice list yet", () => {
    voices = [];
    const controller = createSpeechSynthesisController();
    const onError = vi.fn();
    controller.speak("ሰላም", { lang: "am-ET", onError });
    expect(spoken).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();

    spoken[0]!.onerror?.({ error: "synthesis-failed" });
    // Still no voices after the failure: report it as a missing voice, not "unknown".
    expect(onError).toHaveBeenCalledWith("No voice is installed for am-ET.", "no-voice-for-language");

    voices = VOICES.slice(0, 2);
    controller.speak("Hello", { lang: "en-US", onError });
    spoken[1]!.onerror?.({ error: "language-not-supported" });
    expect(onError).toHaveBeenLastCalledWith(
      "The requested speech language is not supported.",
      "language-not-supported"
    );
  });
});
