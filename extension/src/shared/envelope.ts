/**
 * Zod-free message envelope factory. Kept in its own module so that runtimes
 * that must stay tiny (the content script) can import it without pulling the
 * full zod schema tree.
 */
export function createEnvelope<T extends string, P>(type: T, payload: P) {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    v: 1 as const,
    id,
    type,
    payload,
    ts: Date.now(),
  };
}
