import { describe, expect, it, vi } from 'vitest';
import { createBatchedListener } from '../../src/extension/background/agent/stream';
import type { AgentStreamEvent } from '../../src/shared/messages';

describe('createBatchedListener', () => {
  it('batches tokens and flushes before any other event, preserving order', async () => {
    vi.useFakeTimers();
    const posted: AgentStreamEvent[] = [];
    const listener = createBatchedListener((e) => posted.push(e), 50);
    listener({ type: 'token', token: 'Hel' });
    listener({ type: 'token', token: 'lo' });
    expect(posted).toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(posted).toEqual([{ type: 'token', token: 'Hello' }]);

    listener({ type: 'token', token: ' world' });
    listener({ type: 'thought', rationale: 'r', activeVerb: 'v' });
    expect(posted.slice(1)).toEqual([
      { type: 'token', token: ' world' },
      { type: 'thought', rationale: 'r', activeVerb: 'v' },
    ]);
    await vi.advanceTimersByTimeAsync(100);
    expect(posted).toHaveLength(3);
    vi.useRealTimers();
  });
});
