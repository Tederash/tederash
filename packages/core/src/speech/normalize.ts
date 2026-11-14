/**
 * Turns speech-recognition output into structured field values.
 *
 * Recognition engines transcribe speech as prose: "henok at gmail dot com"
 * stays words, and spelled names arrive as separate letters ("h e n o k").
 * For structured inputs (email, phone) this module converts spoken symbols,
 * spelled letters and number words into the characters the field expects,
 * and ranks candidates so plausible values come first.
 *
 * Prose fields only join spelled letters; email additionally converts English
 * spoken symbols and letter names, and phone fields convert number words.
 */

export type DictationFormat = "text" | "email" | "tel";

/** Multi-word spoken symbols, matched before single words. */
const EMAIL_PHRASES: Array<[RegExp, string]> = [
  [/\bat\s+(?:sign|symbol)\b/g, " @ "],
  [/\bat\s+the\s+rate(?:\s+of)?\b/g, " @ "],
  [/\bfull\s+stop\b/g, " . "],
  [/\bdouble\s+(?:u|you)\b/g, " w "],
];

const EMAIL_WORDS: Record<string, string> = {
  at: "@",
  dot: ".",
  period: ".",
  point: ".",
  underscore: "_",
  dash: "-",
  hyphen: "-",
  minus: "-",
  plus: "+",
};

/** Spoken letter names, so spelled-out names ("aitch ee en oh kay") join correctly. */
const LETTER_NAMES: Record<string, string> = {
  ay: "a", aye: "a", bee: "b", see: "c", sea: "c", cee: "c", dee: "d",
  ee: "e", eff: "f", gee: "g", aitch: "h", haitch: "h", eye: "i", jay: "j",
  kay: "k", el: "l", ell: "l", em: "m", en: "n", oh: "o", pee: "p",
  cue: "q", queue: "q", are: "r", ess: "s", tee: "t", tea: "t", you: "u",
  vee: "v", ex: "x", why: "y", zed: "z", zee: "z",
};

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const TEL_PATTERN = /^\+?\d{6,15}$/;

function normalizeEmail(text: string): string {
  let s = ` ${text.toLowerCase()} `;
  for (const [pattern, replacement] of EMAIL_PHRASES) s = s.replace(pattern, replacement);

  const out = s
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const word = token.replace(/[,!?;:]+$/g, "");
      return EMAIL_WORDS[word] ?? NUMBER_WORDS[word] ?? LETTER_NAMES[word] ?? word;
    })
    .join("");

  // Keep only characters valid in an address; drop sentence-final dots.
  return out.replace(/[^a-z0-9@._%+-]/g, "").replace(/^\.+|\.+$/g, "");
}

/** A token that is one spelled letter ("h", "H.") or hyphen-spelled letters ("H-E-N"). */
const SPELLED_TOKEN = /^(\p{L})\.?$|^\p{L}(?:-\p{L})+$/u;

/**
 * Joins runs of two or more spelled letters into one word, so names spelled
 * letter by letter ("my name is H E N O K") come out whole ("my name is
 * Henok"). Lone single letters ("I", "a") are left alone. A run spoken in
 * capitals is title-cased when longer than 3 letters (names), kept as is
 * otherwise (acronyms such as "U N" → "UN").
 */
function joinSpelledLetters(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let run: string[] = [];

  const flush = () => {
    if (run.length >= 2 || (run.length === 1 && run[0].length > 1)) {
      let word = run.join("");
      if (word.length > 3 && word === word.toUpperCase() && word !== word.toLowerCase()) {
        word = word[0] + word.slice(1).toLowerCase();
      }
      out.push(word);
    } else if (run.length === 1) {
      out.push(run[0]);
    }
    run = [];
  };

  for (const token of tokens) {
    if (SPELLED_TOKEN.test(token)) {
      run.push(token.replace(/[.-]/g, ""));
    } else {
      flush();
      out.push(token);
    }
  }
  flush();
  return out.join(" ");
}

function normalizeTel(text: string): string {
  const tokens = text.toLowerCase().split(/[\s,]+/).filter(Boolean);
  let out = "";
  let repeat = 1;
  for (const token of tokens) {
    if (token === "double") { repeat = 2; continue; }
    if (token === "triple") { repeat = 3; continue; }
    if (token === "plus" && out === "") { out = "+"; continue; }
    const digit = NUMBER_WORDS[token] ?? (token === "oh" || token === "o" ? "0" : undefined);
    const piece = digit ?? token.replace(/[^\d+]/g, "");
    const leadingPlus = out === "" && piece.startsWith("+") ? "+" : "";
    const digits = piece.replace(/\+/g, "");
    out += leadingPlus + (repeat > 1 && digits.length === 1 ? digits.repeat(repeat) : digits);
    repeat = 1;
  }
  return out;
}

/** Converts a recognised transcript into a value suitable for the field format. */
export function normalizeDictation(text: string, format: DictationFormat = "text"): string {
  if (format === "email") return normalizeEmail(text);
  if (format === "tel") return normalizeTel(text);
  return joinSpelledLetters(text);
}

/** Whether a (normalised) value looks complete for its format. */
export function isPlausibleDictation(value: string, format: DictationFormat = "text"): boolean {
  if (format === "email") return EMAIL_PATTERN.test(value);
  if (format === "tel") return TEL_PATTERN.test(value);
  return value.trim().length > 0;
}

/**
 * Normalises every candidate for the format, removes empties and duplicates,
 * and moves plausible values ahead of implausible ones (keeping engine order
 * within each group, since the engine lists its best guess first).
 */
export function rankDictationCandidates(
  candidates: string[],
  format: DictationFormat = "text"
): string[] {
  const unique: string[] = [];
  for (const raw of candidates) {
    const value = normalizeDictation(raw, format);
    if (value && !unique.some((u) => u.toLowerCase() === value.toLowerCase())) unique.push(value);
  }
  if (format === "text") return unique;
  const plausible = unique.filter((v) => isPlausibleDictation(v, format));
  const rest = unique.filter((v) => !isPlausibleDictation(v, format));
  return [...plausible, ...rest];
}

/** Maps an `<input type>` to a dictation format. */
export function dictationFormatForInputType(type?: string): DictationFormat {
  const t = type?.toLowerCase();
  return t === "email" ? "email" : t === "tel" ? "tel" : "text";
}
