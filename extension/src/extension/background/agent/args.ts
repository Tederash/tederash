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
