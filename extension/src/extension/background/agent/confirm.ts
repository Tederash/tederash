/**
 * Pending user confirmations for consequential actions. The loop awaits
 * `awaitConfirmation`; the side panel answers via the port (`agent/confirm`).
 */

export const CONFIRMATION_TIMEOUT_MS = 5 * 60_000;

const pending = new Map<string, { resolve: (approved: boolean) => void; timer: ReturnType<typeof setTimeout> }>();

export function awaitConfirmation(id: string, signal?: AbortSignal, timeoutMs = CONFIRMATION_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (approved: boolean) => {
      const entry = pending.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(id);
      resolve(approved);
    };
    pending.set(id, { resolve: finish, timer: setTimeout(() => finish(false), timeoutMs) });
    signal?.addEventListener('abort', () => finish(false));
  });
}

/** Returns false if there was no pending confirmation with that id. */
export function resolveConfirmation(id: string, approved: boolean): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  entry.resolve(approved);
  return true;
}

export function hasPendingConfirmation(id: string): boolean {
  return pending.has(id);
}
