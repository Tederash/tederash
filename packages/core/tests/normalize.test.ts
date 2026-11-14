import { describe, expect, it } from "vitest";
import {
  dictationFormatForInputType,
  isPlausibleDictation,
  normalizeDictation,
  rankDictationCandidates,
} from "../src";

describe("normalizeDictation: email", () => {
  it.each([
    ["henok at gmail dot com", "henok@gmail.com"],
    ["Henok at gmail.com", "henok@gmail.com"],
    ["hey look at gmail.com", "heylook@gmail.com"],
    ["h e n o k at gmail dot com", "henok@gmail.com"],
    ["H E N O K at gmail.com.", "henok@gmail.com"],
    ["aitch ee en oh kay at gmail dot com", "henok@gmail.com"],
    ["abebe underscore bikila at example dot org", "abebe_bikila@example.org"],
    ["abebe dash bikila at example dot co dot uk", "abebe-bikila@example.co.uk"],
    ["abebe plus news at gmail dot com", "abebe+news@gmail.com"],
    ["henok two three at gmail dot com", "henok23@gmail.com"],
    ["henok at sign gmail dot com", "henok@gmail.com"],
    ["henok at the rate gmail dot com", "henok@gmail.com"],
    ["at gmail dot com", "@gmail.com"],
  ])("%s → %s", (spoken, expected) => {
    expect(normalizeDictation(spoken, "email")).toBe(expected);
  });
});

describe("normalizeDictation: tel", () => {
  it.each([
    ["plus two five one nine one one", "+251911"],
    ["0911 234 567", "0911234567"],
    ["oh nine one one double two three four", "09112234"],
    ["triple five one two one two", "5551212"],
    ["+251 91-123-4567", "+251911234567"],
  ])("%s → %s", (spoken, expected) => {
    expect(normalizeDictation(spoken, "tel")).toBe(expected);
  });
});

describe("normalizeDictation: text", () => {
  it("leaves prose untouched apart from trimming", () => {
    expect(normalizeDictation("  meet me at five  ")).toBe("meet me at five");
  });

  it.each([
    ["my name is h e n o k", "my name is henok"],
    ["my name is H E N O K", "my name is Henok"],
    ["Abebe B I K I L A", "Abebe Bikila"],
    ["H-E-N-O-K Tadesse", "Henok Tadesse"],
    ["H. E. N. O. K.", "Henok"],
    ["I work at the U N", "I work at the UN"],
    ["I am a teacher", "I am a teacher"],
    ["ሄ ኖ ክ", "ሄኖክ"],
  ])("joins spelled letters: %s → %s", (spoken, expected) => {
    expect(normalizeDictation(spoken)).toBe(expected);
  });
});

describe("isPlausibleDictation", () => {
  it("validates email and phone shapes", () => {
    expect(isPlausibleDictation("henok@gmail.com", "email")).toBe(true);
    expect(isPlausibleDictation("heylook.gmail.com", "email")).toBe(false);
    expect(isPlausibleDictation("+251911234567", "tel")).toBe(true);
    expect(isPlausibleDictation("12", "tel")).toBe(false);
  });
});

describe("rankDictationCandidates", () => {
  it("normalises, de-duplicates and puts valid emails first", () => {
    expect(
      rankDictationCandidates(
        ["hey look gmail.com", "henok at gmail dot com", "Henok at gmail.com", "hey look at gmail.com"],
        "email"
      )
    ).toEqual(["henok@gmail.com", "heylook@gmail.com", "heylookgmail.com"]);
  });

  it("keeps engine order for plain text", () => {
    expect(rankDictationCandidates(["a baby bikila", "Abebe Bikila", " a baby bikila "])).toEqual([
      "a baby bikila",
      "Abebe Bikila",
    ]);
  });

  it("joins spelled letters in plain-text candidates", () => {
    expect(rankDictationCandidates(["H E N O K", "hey look"])).toEqual(["Henok", "hey look"]);
  });
});

describe("dictationFormatForInputType", () => {
  it("maps input types", () => {
    expect(dictationFormatForInputType("email")).toBe("email");
    expect(dictationFormatForInputType("TEL")).toBe("tel");
    expect(dictationFormatForInputType("text")).toBe("text");
    expect(dictationFormatForInputType(undefined)).toBe("text");
  });
});
