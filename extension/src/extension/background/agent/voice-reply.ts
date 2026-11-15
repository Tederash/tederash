/**
 * Pending spoken answers. The `listen` tool awaits `awaitVoiceReply`; the side panel
 * records, then answers over the port (`agent/voiceReply`) with either the audio it
 * captured or, when it transcribed locally, the text.
 *
 * Same shape as confirm.ts: the loop suspends mid-turn, so asking the user something
 * does not end the turn.
 */

export const VOICE_REPLY_TIMEOUT_MS = 2 * 60_000;

export type VoiceReply =
  | { kind: 'audio'; audio: ArrayBuffer; mimeType: string; language?: string }
  | { kind: 'text'; text: string; language?: string }
  | { kind: 'cancelled'; reason?: string };

const pending = new Map<
  string,
  { resolve: (reply: VoiceReply) => void; timer: ReturnType<typeof setTimeout> }
>();

export function awaitVoiceReply(
  id: string,
  signal?: AbortSignal,
  timeoutMs = VOICE_REPLY_TIMEOUT_MS
): Promise<VoiceReply> {
  return new Promise((resolve) => {
    const finish = (reply: VoiceReply) => {
      const entry = pending.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(id);
      resolve(reply);
    };
    pending.set(id, {
      resolve: finish,
      timer: setTimeout(() => finish({ kind: 'cancelled', reason: 'timeout' }), timeoutMs),
    });
    signal?.addEventListener('abort', () => finish({ kind: 'cancelled', reason: 'stopped' }));
  });
}

/** Returns false if there was no pending listen with that id. */
export function resolveVoiceReply(id: string, reply: VoiceReply): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  entry.resolve(reply);
  return true;
}

export function hasPendingVoiceReply(id: string): boolean {
  return pending.has(id);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Port messages are JSON, not structured clones, so the panel sends recorded audio
 * base64-encoded. Anything malformed counts as a cancellation rather than a crash.
 */
export function parseVoiceReplyMessage(msg: unknown): VoiceReply {
  if (!msg || typeof msg !== 'object') return { kind: 'cancelled' };
  const m = msg as Record<string, unknown>;
  const language = typeof m.language === 'string' ? m.language : undefined;

  if (m.kind === 'text' && typeof m.text === 'string' && m.text.trim()) {
    return { kind: 'text', text: m.text.trim(), language };
  }
  if (m.kind === 'audio' && typeof m.audioBase64 === 'string' && m.audioBase64) {
    try {
      return {
        kind: 'audio',
        audio: base64ToArrayBuffer(m.audioBase64),
        mimeType: typeof m.mimeType === 'string' ? m.mimeType : 'audio/webm',
        language,
      };
    } catch {
      return { kind: 'cancelled', reason: 'unreadable' };
    }
  }
  return { kind: 'cancelled', reason: typeof m.reason === 'string' ? m.reason : undefined };
}
