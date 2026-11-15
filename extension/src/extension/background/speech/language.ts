/**
 * Language handling for speech recognition.
 *
 * A missing language hint is what produced "Радис да контент от диспетч" from
 * English speech: Whisper auto-detected, guessed Russian on a short clip, and
 * returned fluent-looking nonsense. So a hint is now always sent, and a transcript
 * written in the wrong script for the requested language is rejected rather than
 * passed on to be typed into someone's form.
 */

/** Base language subtag, lowercased: "am-ET" -> "am". */
export function baseLanguage(tag: string): string {
  return tag.split(/[-_]/)[0]!.toLowerCase();
}

/**
 * Resolved in order of how much we trust it: what the caller asked for, the saved
 * setting, the browser's own language, then English. Never empty.
 */
export function resolveSpeechLanguage(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language : undefined;
  return browser?.trim() || 'en-US';
}

/**
 * Languages Whisper cannot usefully transcribe. Whisper large-v3 scores 99.8% WER
 * on Amharic (FLEURS) — not a tuning problem, it simply does not work — and the
 * other Ethiopic languages are no better. Returning nonsense would be worse than
 * saying so, especially when the text is about to be typed into a page.
 */
const WHISPER_CANNOT_TRANSCRIBE = new Set(['am', 'ti', 'om']);

export function whisperSupportsLanguage(language: string): boolean {
  return !WHISPER_CANNOT_TRANSCRIBE.has(baseLanguage(language));
}

type ScriptName = 'latin' | 'ethiopic' | 'cyrillic' | 'arabic' | 'hebrew' | 'greek' | 'han';

const SCRIPT_RANGES: Record<ScriptName, RegExp> = {
  latin: /[A-Za-zÀ-ɏ]/,
  ethiopic: /[ሀ-፿]/,
  cyrillic: /[Ѐ-ӿ]/,
  arabic: /[؀-ۿ]/,
  hebrew: /[֐-׿]/,
  greek: /[Ͱ-Ͽ]/,
  han: /[一-鿿぀-ヿ]/,
};

/** Only languages whose script is unambiguous enough to check against. */
const EXPECTED_SCRIPT: Record<string, ScriptName> = {
  am: 'ethiopic',
  ti: 'ethiopic',
  en: 'latin',
  om: 'latin',
  sw: 'latin',
  fr: 'latin',
  es: 'latin',
  de: 'latin',
  it: 'latin',
  pt: 'latin',
  nl: 'latin',
  tr: 'latin',
  id: 'latin',
  ru: 'cyrillic',
  uk: 'cyrillic',
  bg: 'cyrillic',
  ar: 'arabic',
  fa: 'arabic',
  he: 'hebrew',
  el: 'greek',
  zh: 'han',
  ja: 'han',
};

/** Share of script-bearing characters that must match before we trust a transcript. */
const MIN_EXPECTED_SHARE = 0.5;

/**
 * True when the transcript is mostly written in a different script from the one the
 * requested language uses — the signature of a mis-detected language.
 */
export function looksLikeWrongScript(text: string, language: string): boolean {
  const expected = EXPECTED_SCRIPT[baseLanguage(language)];
  if (!expected) return false; // Unknown or mixed-script language: no opinion.

  const expectedRe = SCRIPT_RANGES[expected];
  let expectedCount = 0;
  let scriptBearing = 0;

  for (const char of text) {
    const isScriptBearing = Object.values(SCRIPT_RANGES).some((re) => re.test(char));
    if (!isScriptBearing) continue;
    scriptBearing++;
    if (expectedRe.test(char)) expectedCount++;
  }

  // Too little to judge: a number or a single word is not evidence of a wrong script.
  if (scriptBearing < 4) return false;
  return expectedCount / scriptBearing < MIN_EXPECTED_SHARE;
}
