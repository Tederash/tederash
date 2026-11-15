/**
 * Models (notably gpt-oss) send `null` for optional tool parameters. Tool schemas
 * accept that (`.nullish()`); this strips nulls before arguments reach the policy
 * engine and the content script, whose schemas treat absent and null differently.
 */
export function normalizeToolArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      out[key] = value.trim();
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      out[key] = normalizeToolArgs(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const ETHIOPIC_WORD = /[ሀ-፿]+/g;

/**
 * Ge'ez-script words in a model-proposed value that appear nowhere in what the user
 * wrote (or on the page). Models tokenise Amharic into many pieces and can silently
 * drop or swap syllables in names ("ሸዋማሬ" → "ሸዋረ"); a filled name must be the
 * user's own spelling. A word counts as supported when it is a substring of a source,
 * so "ቢቂላ" is supported by "ቢቂላን" (object ending). Latin text is not checked.
 */
export function unsupportedEthiopicWords(value: string, sources: string[]): string[] {
  const words = value.match(ETHIOPIC_WORD) ?? [];
  return words.filter((w) => !sources.some((s) => s.includes(w)));
}
