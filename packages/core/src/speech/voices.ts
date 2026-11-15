/**
 * Voice availability for speech synthesis.
 *
 * Browsers only ship voices for some languages (desktop Chrome, Windows and
 * macOS have no Amharic voice, Android does). Speaking Ethiopic text through
 * an English voice produces noise, so callers check for a usable voice first
 * and tell the user when there is none instead of failing silently.
 */

/** The fields of a voice this module looks at (SpeechSynthesisVoice-compatible). */
export interface VoiceLike {
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
}

/** Primary language subtag of a BCP-47 tag: "am-ET" → "am", "en_GB" → "en". */
export function primaryLanguage(tag?: string): string {
  return (tag ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
}

/** True when a voice's language is the same language as `lang` (region may differ). */
export function voiceSpeaksLanguage(voice: VoiceLike, lang?: string): boolean {
  const wanted = primaryLanguage(lang);
  return wanted !== "" && primaryLanguage(voice.lang) === wanted;
}

/**
 * Best voice for a language: an exact tag match first, then the same language in
 * another region. Local and default voices win ties. Undefined when no voice
 * speaks the language, or when the list is empty (voices may not be loaded yet).
 */
export function findVoiceForLanguage<T extends VoiceLike>(
  voices: readonly T[],
  lang?: string
): T | undefined {
  const wanted = (lang ?? "").trim().toLowerCase().replace("_", "-");
  if (!wanted) return undefined;
  const candidates = voices.filter((v) => voiceSpeaksLanguage(v, wanted));
  if (candidates.length === 0) return undefined;
  const score = (v: T) =>
    (v.lang.toLowerCase().replace("_", "-") === wanted ? 4 : 0) +
    (v.localService ? 2 : 0) +
    (v.default ? 1 : 0);
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** True when at least one voice speaks the language. False while voices are still loading. */
export function hasVoiceForLanguage(voices: readonly VoiceLike[], lang?: string): boolean {
  return findVoiceForLanguage(voices, lang) !== undefined;
}
